"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "../button";
import type { NotificationTestRecipientSettings as Settings } from "../../lib/server/notification-test-recipient-settings";

type Payload = { error?: string; settings?: Settings };

const fieldClassName =
  "h-[50px] w-full rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] disabled:cursor-not-allowed disabled:bg-[var(--background)] disabled:text-[var(--muted)]";

export function NotificationTestRecipientSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [recipient, setRecipient] = useState("");
  const [status, setStatus] = useState("Loading notification safeguards…");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/recovery/notifications/test-recipient", {
          cache: "no-store",
        });
        const payload = (await response.json()) as Payload;
        if (!response.ok || !payload.settings) {
          throw new Error(payload.error ?? "Unable to load notification recipient settings.");
        }
        if (!cancelled) {
          setSettings(payload.settings);
          setRecipient(payload.settings.proposedRecipient ?? "");
          setStatus("");
        }
      } catch (error) {
        if (!cancelled) setStatus(error instanceof Error ? error.message : "Unable to load settings.");
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  async function update(action: "approve" | "clear" | "propose") {
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/recovery/notifications/test-recipient", {
        body: JSON.stringify({ action, recipient }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });
      const payload = (await response.json()) as Payload;
      if (!response.ok || !payload.settings) {
        throw new Error(payload.error ?? "Unable to update notification recipient.");
      }
      setSettings(payload.settings);
      setRecipient(payload.settings.proposedRecipient ?? "");
      setStatus(
        action === "approve"
          ? "Test recipient approved. Notification delivery remains disabled."
          : action === "clear"
            ? "Test recipient configuration cleared."
            : "Proposed recipient saved for separate review. Delivery remains disabled.",
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update notification recipient.");
    } finally {
      setBusy(false);
    }
  }

  async function propose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await update("propose");
  }

  const canApprove = Boolean(
    settings?.proposedRecipient &&
    settings.proposedRecipient === recipient.trim().toLowerCase() &&
    settings.approvedRecipient !== settings.proposedRecipient,
  );

  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)] lg:col-span-2" id="notification-test-recipient">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.04em] text-[var(--muted)]">Essential notifications</p>
          <h2 className="mt-2 text-base font-medium text-[var(--foreground)]">Reviewed test recipient</h2>
          <p className="mt-2 max-w-3xl text-sm leading-5 text-[var(--muted-strong)]">
            Save a proposed address, review it, then approve that exact address separately. This workflow cannot enable notification delivery.
          </p>
        </div>
        <span className="rounded bg-[var(--background)] px-3 py-1 text-xs text-[var(--muted-strong)]">Delivery disabled</span>
      </div>

      <form className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end" onSubmit={propose}>
        <label className="text-sm font-medium text-[var(--foreground)]">
          Proposed test recipient
          <input className={`${fieldClassName} mt-2`} disabled={busy || !settings} onChange={(event) => setRecipient(event.target.value)} placeholder="owner+alerts@example.com" required type="email" value={recipient} />
        </label>
        <Button disabled={busy || !settings || recipient.trim().toLowerCase() === settings.proposedRecipient} type="submit">Save for review</Button>
      </form>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] p-4">
          <dt className="text-xs text-[var(--muted)]">Awaiting review</dt>
          <dd className="mt-1 break-all text-sm font-medium text-[var(--foreground)]">{settings?.proposedRecipient ?? "None"}</dd>
        </div>
        <div className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] p-4">
          <dt className="text-xs text-[var(--muted)]">Approved recipient</dt>
          <dd className="mt-1 break-all text-sm font-medium text-[var(--foreground)]">{settings?.approvedRecipient ?? "None"}</dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p aria-live="polite" className="text-sm text-[var(--muted-strong)]">{status}</p>
        <div className="flex flex-wrap gap-3">
          <Button disabled={busy || (!settings?.proposedRecipient && !settings?.approvedRecipient)} onClick={() => void update("clear")} type="button" variant="secondary">Clear</Button>
          <Button disabled={busy || !canApprove} onClick={() => void update("approve")} type="button">Approve exact recipient</Button>
        </div>
      </div>
      <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
        Approval records an audit entry only. Account delivery remains off and the global delivery gate remains unchanged.
      </p>
    </section>
  );
}
