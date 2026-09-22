"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CaseManualActions({
  failedPaymentId,
  manuallyPausedAt,
}: {
  failedPaymentId: string;
  manuallyPausedAt: string | null;
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const paused = manuallyPausedAt !== null;

  async function updatePause() {
    const nextPaused = !paused;
    if (
      nextPaused &&
      !window.confirm(
        "Pause future unclaimed recovery emails for this case? A message already being processed may still finish sending.",
      )
    ) {
      return;
    }

    setIsSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/recovery/cases/${failedPaymentId}/pause`, {
        body: JSON.stringify({ paused: nextPaused }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });
      const payload = (await response.json()) as {
        error?: string;
        result?: { changedMessages: number; paused: boolean };
      };
      if (!response.ok || !payload.result) {
        throw new Error(payload.error ?? "Unable to update recovery emails.");
      }

      setMessage(
        payload.result.paused
          ? `Future recovery emails paused (${payload.result.changedMessages} updated).`
          : `Recovery emails resumed (${payload.result.changedMessages} updated).`,
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update recovery emails.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-medium text-[var(--foreground)]">Case controls</h2>
          <p className="mt-1 max-w-2xl text-sm leading-5 text-[var(--muted)]">
            {paused
              ? "Future emails for this case are manually paused. Stripe events and case history continue to update."
              : "Pause future emails for this case without changing Stripe, marking the invoice paid, or closing the case."}
          </p>
          {paused ? <p className="mt-2 text-xs text-[var(--muted)]">Paused {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(manuallyPausedAt))}</p> : null}
        </div>
        <button
          className={`h-10 shrink-0 rounded-[var(--radius-control)] px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${paused ? "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]" : "border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)]"}`}
          disabled={isSaving}
          onClick={updatePause}
          type="button"
        >
          {isSaving ? "Saving…" : paused ? "Resume recovery emails" : "Pause recovery emails"}
        </button>
      </div>
      <p aria-live="polite" className="mt-3 text-sm text-[var(--muted-strong)]">{message}</p>
    </section>
  );
}
