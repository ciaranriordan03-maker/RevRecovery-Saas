"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "../button";
import { Icon } from "../ui-icon";
import type { NotificationTestRecipientSettings as Settings } from "../../lib/server/notification-test-recipient-settings";

type Payload = { error?: string; settings?: Settings };
type FeedbackTone = "error" | "muted" | "success";

const alertCategories = [
  "Stripe connection or event-processing problems",
  "Sending-domain problems that may affect recovery",
  "A daily summary when recovery cases need personal attention",
] as const;

const fieldClassName =
  "h-11 w-full rounded-[8px] border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] disabled:cursor-not-allowed disabled:bg-[var(--background)] disabled:text-[var(--muted)]";

function getAlertState(settings: Settings) {
  const testDeliveryActive = Boolean(settings.deliveryEnabled) && settings.deliveryMode === "test";
  const awaitingApproval = Boolean(
    settings.proposedRecipient &&
      settings.proposedRecipient !== settings.approvedRecipient,
  );

  if (testDeliveryActive) {
    return {
      description: "Controlled team alerts are active for the approved recipient.",
      label: "Test alerts active",
      tone: "success" as const,
    };
  }

  if (awaitingApproval) {
    return {
      description: "A saved recipient is waiting for your approval.",
      label: "Needs attention",
      tone: "warning" as const,
    };
  }

  if (!settings.approvedRecipient) {
    return {
      description: "Choose and approve a team recipient to finish the setup.",
      label: "Not configured",
      tone: "neutral" as const,
    };
  }

  return {
    description: "The recipient is approved, but account-alert delivery is off.",
    label: "Ready but disabled",
    tone: "primary" as const,
  };
}

async function fetchAccountAlertSettings() {
  const response = await fetch("/api/recovery/notifications/test-recipient", {
    cache: "no-store",
  });
  const payload = (await response.json()) as Payload;

  if (!response.ok || !payload.settings) {
    throw new Error(payload.error ?? "Unable to load account alerts.");
  }

  return payload.settings;
}

export function AccountAlertsSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [recipient, setRecipient] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>("muted");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setFeedback("");

    try {
      const nextSettings = await fetchAccountAlertSettings();
      setSettings(nextSettings);
      setRecipient(
        nextSettings.proposedRecipient ?? nextSettings.approvedRecipient ?? "",
      );
    } catch (error) {
      setSettings(null);
      setFeedbackTone("error");
      setFeedback(error instanceof Error ? error.message : "Unable to load account alerts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    void fetchAccountAlertSettings()
      .then((nextSettings) => {
        if (cancelled) return;
        setSettings(nextSettings);
        setRecipient(
          nextSettings.proposedRecipient ?? nextSettings.approvedRecipient ?? "",
        );
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setSettings(null);
        setFeedbackTone("error");
        setFeedback(
          error instanceof Error ? error.message : "Unable to load account alerts.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function update(action: "approve" | "clear" | "propose") {
    setBusy(true);
    setFeedback("");

    try {
      const response = await fetch("/api/recovery/notifications/test-recipient", {
        body: JSON.stringify({ action, recipient }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });
      const payload = (await response.json()) as Payload;

      if (!response.ok || !payload.settings) {
        throw new Error(payload.error ?? "Unable to update the alert recipient.");
      }

      setSettings(payload.settings);
      setRecipient(
        payload.settings.proposedRecipient ?? payload.settings.approvedRecipient ?? "",
      );
      setFeedbackTone("success");
      setFeedback(
        action === "approve"
          ? "Recipient approved. Account alerts remain disabled."
          : action === "clear"
            ? "Alert recipient cleared."
            : "Recipient saved. Review and approve the address to finish setup.",
      );
    } catch (error) {
      setFeedbackTone("error");
      setFeedback(error instanceof Error ? error.message : "Unable to update the alert recipient.");
    } finally {
      setBusy(false);
    }
  }

  async function propose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await update("propose");
  }

  if (loading) {
    return (
      <div aria-live="polite" className="flex items-center gap-3 text-sm text-[var(--muted)]" role="status">
        <span className="size-2 animate-pulse rounded-full bg-[var(--primary)]" />
        Loading account alerts…
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex flex-col gap-4 rounded-[10px] border border-[var(--warning-text)]/20 bg-[var(--warning-soft)] p-4 sm:flex-row sm:items-center sm:justify-between" role="alert">
        <div>
          <p className="text-sm font-medium text-[var(--foreground)]">Account alerts need attention</p>
          <p className="mt-1 text-xs leading-5 text-[var(--warning-text)]">
            {feedback || "RevRecovery could not confirm the current alert setup."}
          </p>
        </div>
        <Button className="h-9 shrink-0 px-4 text-sm" onClick={() => void load()} variant="secondary">
          Try again
        </Button>
      </div>
    );
  }

  const alertState = getAlertState(settings);
  const toneClass = {
    neutral: "bg-[var(--surface-muted)] text-[var(--muted-strong)]",
    primary: "bg-[var(--primary-soft)] text-[var(--primary)]",
    success: "bg-[var(--success-badge)] text-[var(--success-badge-text)]",
    warning: "bg-[var(--warning-soft)] text-[var(--warning-text)]",
  }[alertState.tone];
  const normalizedRecipient = recipient.trim().toLowerCase();
  const canApprove = Boolean(
    settings.proposedRecipient &&
      settings.proposedRecipient === normalizedRecipient &&
      settings.approvedRecipient !== settings.proposedRecipient,
  );
  const canSave = Boolean(
    normalizedRecipient && normalizedRecipient !== settings.proposedRecipient,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--foreground)]">
            Important operational updates for your team
          </p>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Account alerts are separate from the recovery emails sent to customers.
          </p>
        </div>
        <span className={`w-fit rounded-[6px] px-2.5 py-1 text-xs font-semibold ${toneClass}`}>
          {alertState.label}
        </span>
      </div>

      <dl className="grid overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--background)] sm:grid-cols-2 sm:divide-x sm:divide-[var(--border)]">
        <div className="border-b border-[var(--border)] p-4 sm:border-b-0">
          <dt className="text-xs font-medium text-[var(--muted)]">Delivery</dt>
          <dd className="mt-1 text-sm font-medium text-[var(--foreground)]">
            {settings.deliveryEnabled
              ? "Controlled test alerts are active"
              : "No account alerts are being delivered"}
          </dd>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            {alertState.description}
          </p>
        </div>
        <div className="p-4">
          <dt className="text-xs font-medium text-[var(--muted)]">Approved recipient</dt>
          <dd className="mt-1 break-all text-sm font-medium text-[var(--foreground)]">
            {settings.approvedRecipient ?? "Not configured"}
          </dd>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            This address is only for account-level team updates.
          </p>
        </div>
      </dl>

      <details className="group rounded-[10px] border border-[var(--border)] bg-[var(--surface)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-[var(--muted-strong)] [&::-webkit-details-marker]:hidden">
          What account alerts cover
          <Icon className="size-4 transition group-open:rotate-180" name="chevron-down" />
        </summary>
        <ul className="grid gap-3 border-t border-[var(--border)] bg-[var(--background)] px-4 py-4 md:grid-cols-3">
          {alertCategories.map((category) => (
            <li className="flex items-start gap-2 text-xs leading-5 text-[var(--muted-strong)]" key={category}>
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success)]">
                <Icon className="size-3" name="check" />
              </span>
              {category}
            </li>
          ))}
        </ul>
      </details>

      <details className="group rounded-[10px] border border-[var(--border)] bg-[var(--surface)]" id="review-alert-settings">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-[var(--primary)] [&::-webkit-details-marker]:hidden">
          Review alert settings
          <Icon className="size-4 transition group-open:rotate-180" name="chevron-down" />
        </summary>
        <div className="border-t border-[var(--border)] px-4 py-4">
          <p className="max-w-2xl text-xs leading-5 text-[var(--muted)]">
            Choose where controlled account-alert tests would go. Saving or approving an address does not turn alerts on.
          </p>

          <form className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end" onSubmit={propose}>
            <label className="text-sm font-medium text-[var(--foreground)]">
              Team alert recipient
              <input
                className={`${fieldClassName} mt-2`}
                disabled={busy}
                onChange={(event) => setRecipient(event.target.value)}
                placeholder="owner@company.com"
                required
                type="email"
                value={recipient}
              />
            </label>
            <Button className="h-11 px-4 text-sm" disabled={busy || !canSave} type="submit">
              {busy ? "Saving…" : "Save for review"}
            </Button>
          </form>

          {settings.proposedRecipient && settings.proposedRecipient !== settings.approvedRecipient ? (
            <div className="mt-4 flex flex-col gap-3 rounded-[8px] border border-[var(--primary-border)] bg-[var(--primary-soft)] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium text-[var(--muted)]">Waiting for approval</p>
                <p className="mt-1 break-all text-sm font-medium text-[var(--foreground)]">
                  {settings.proposedRecipient}
                </p>
              </div>
              <Button className="h-9 shrink-0 px-4 text-sm" disabled={busy || !canApprove} onClick={() => void update("approve")} type="button">
                Approve recipient
              </Button>
            </div>
          ) : null}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p
              aria-live="polite"
              className={`text-xs leading-5 ${
                feedbackTone === "error"
                  ? "text-[var(--danger)]"
                  : feedbackTone === "success"
                    ? "text-[var(--success)]"
                    : "text-[var(--muted)]"
              }`}
            >
              {feedback || "Account alerts remain disabled until separately enabled outside this setup."}
            </p>
            {settings.proposedRecipient || settings.approvedRecipient ? (
              <Button className="h-9 shrink-0 px-4 text-sm" disabled={busy} onClick={() => void update("clear")} type="button" variant="secondary">
                Clear recipient
              </Button>
            ) : null}
          </div>
        </div>
      </details>
    </div>
  );
}
