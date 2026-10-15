"use client";

import { useEffect, useState } from "react";
import { Button } from "../button";
import type { NotificationTestAuthorizationSettings as Settings } from "../../lib/server/notification-test-authorization";

type Payload = { error?: string; settings?: Settings };

function formatDate(value: string | null | undefined) {
  if (!value) return "Not applicable";
  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Dublin",
  }).format(new Date(value));
}

export function NotificationTestAuthorization() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [status, setStatus] = useState("Loading one-time authorization safeguards…");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/recovery/notifications/test-authorization", {
          cache: "no-store",
        });
        const payload = (await response.json()) as Payload;
        if (!response.ok || !payload.settings) {
          throw new Error(payload.error ?? "Unable to load notification authorization.");
        }
        if (!cancelled) {
          setSettings(payload.settings);
          setStatus("");
        }
      } catch (error) {
        if (!cancelled) setStatus(error instanceof Error ? error.message : "Unable to load authorization.");
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  async function update(action: "approve" | "request" | "revoke") {
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/recovery/notifications/test-authorization", {
        body: JSON.stringify({
          action,
          authorizationId: settings?.authorization?.id,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as Payload;
      if (!response.ok || !payload.settings) {
        throw new Error(payload.error ?? "Unable to update notification authorization.");
      }
      setSettings(payload.settings);
      setStatus(
        action === "request"
          ? "Authorization requested for separate review. Delivery remains disabled."
          : action === "approve"
            ? "One-time authorization approved for 15 minutes. It is not connected to delivery yet."
            : "Authorization revoked. Delivery remains disabled.",
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update authorization.");
    } finally {
      setBusy(false);
    }
  }

  const authorization = settings?.authorization;
  const active = authorization?.status === "pending" || authorization?.status === "approved";

  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]" id="notification-test-authorization">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.04em] text-[var(--muted)]">D4k · Controlled authorization</p>
          <h2 className="mt-2 text-base font-medium text-[var(--foreground)]">One-time test-email approval</h2>
          <p className="mt-2 max-w-3xl text-sm leading-5 text-[var(--muted-strong)]">
            Request a review record, then approve that exact record separately. Approval expires after 15 minutes and cannot enable general delivery.
          </p>
        </div>
        <span className="rounded bg-[var(--warning-soft)] px-3 py-1 text-xs font-medium text-[var(--warning-text)]">Sending disconnected</span>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] p-4">
          <dt className="text-xs text-[var(--muted)]">Authorization state</dt>
          <dd className="mt-1 capitalize text-sm font-medium text-[var(--foreground)]">{authorization?.status ?? "Not requested"}</dd>
        </div>
        <div className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] p-4">
          <dt className="text-xs text-[var(--muted)]">Exact recipient</dt>
          <dd className="mt-1 break-all text-sm font-medium text-[var(--foreground)]">{authorization?.recipientEmail ?? "None"}</dd>
        </div>
        <div className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] p-4">
          <dt className="text-xs text-[var(--muted)]">Expires</dt>
          <dd className="mt-1 text-sm font-medium text-[var(--foreground)]">{formatDate(authorization?.expiresAt)}</dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p aria-live="polite" className="text-sm text-[var(--muted-strong)]">{status}</p>
        <div className="flex flex-wrap gap-3">
          <Button disabled={busy || !active} onClick={() => void update("revoke")} type="button" variant="secondary">Revoke</Button>
          {authorization?.status === "pending" ? (
            <Button disabled={busy} onClick={() => void update("approve")} type="button">Approve exact request</Button>
          ) : (
            <Button disabled={busy || active} onClick={() => void update("request")} type="button">Request authorization</Button>
          )}
        </div>
      </div>

      <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
        This records authorization evidence only. It does not change the global gate, account gate, delivery mode, event status, or email provider.
      </p>
    </section>
  );
}
