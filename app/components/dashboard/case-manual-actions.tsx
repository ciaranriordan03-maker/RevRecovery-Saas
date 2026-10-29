"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Feedback = {
  message: string;
  tone: "error" | "success";
};

export function CaseManualActions({
  className = "",
  failedPaymentId,
  manuallyPausedAt,
}: {
  className?: string;
  failedPaymentId: string;
  manuallyPausedAt: string | null;
}) {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const [confirmingPause, setConfirmingPause] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pauseOverride, setPauseOverride] = useState<boolean | null>(null);
  const paused = pauseOverride ?? manuallyPausedAt !== null;

  useEffect(() => {
    if (!confirmingPause) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    confirmRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setConfirmingPause(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [confirmingPause]);

  async function updatePause(nextPaused: boolean) {
    setConfirmingPause(false);
    setIsSaving(true);
    setFeedback(null);

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

      setPauseOverride(payload.result.paused);
      setFeedback({
        message: payload.result.paused
          ? `Future recovery emails paused (${payload.result.changedMessages} updated).`
          : `Recovery emails resumed (${payload.result.changedMessages} updated).`,
        tone: "success",
      });
      router.refresh();
    } catch (error) {
      const explanation = error instanceof Error
        ? error.message
        : "Unable to update recovery emails.";
      setFeedback({
        message: `Nothing changed. ${explanation}`,
        tone: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  const pausedAtLabel = manuallyPausedAt
    ? new Intl.DateTimeFormat("en-IE", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(manuallyPausedAt))
    : null;

  return (
    <>
      <section
        className={`rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 ${className}`}
      >
        <h2 className="text-base font-semibold text-[var(--foreground)]">Case controls</h2>
        <p className="mt-3 text-[13px] leading-5 text-[var(--foreground)]">
          {paused
            ? "Future emails for this case are manually paused. Stripe events and case history continue to update."
            : "Pause only future, unclaimed recovery emails for this case. Already-processing emails may still finish."}
        </p>
        {pausedAtLabel ? (
          <p className="mt-2 text-xs text-[var(--muted)]">Paused {pausedAtLabel}</p>
        ) : null}
        <button
          className={`mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-control)] px-4 text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] ${
            paused
              ? "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
              : "border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--border-strong)]"
          }`}
          disabled={isSaving}
          onClick={() => {
            if (paused) {
              void updatePause(false);
            } else {
              setFeedback(null);
              setConfirmingPause(true);
            }
          }}
          ref={triggerRef}
          type="button"
        >
          {isSaving
            ? paused
              ? "Resuming…"
              : "Pausing…"
            : paused
              ? "Resume recovery emails"
              : "Pause recovery emails"}
        </button>
        {feedback ? (
          <div
            className={`mt-4 rounded-[var(--radius-control)] border px-3 py-2.5 text-xs leading-5 ${
              feedback.tone === "error"
                ? "border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]"
                : "border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]"
            }`}
            role={feedback.tone === "error" ? "alert" : "status"}
          >
            {feedback.message}
          </div>
        ) : null}
      </section>

      {confirmingPause ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-5">
          <button
            aria-label="Cancel pausing recovery emails"
            className="absolute inset-0 cursor-default bg-[var(--overlay)]"
            onClick={() => {
              setConfirmingPause(false);
              triggerRef.current?.focus();
            }}
            type="button"
          />
          <div
            aria-describedby="pause-case-description"
            aria-labelledby="pause-case-title"
            aria-modal="true"
            className="relative w-full max-w-md rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]"
            role="dialog"
          >
            <h2 className="text-lg font-semibold text-[var(--foreground)]" id="pause-case-title">
              Pause recovery emails?
            </h2>
            <p className="mt-3 text-[13px] leading-5 text-[var(--muted-strong)]" id="pause-case-description">
              Future unclaimed recovery emails for this case will be paused. An email already being processed may still finish. Stripe retries and case history will not change.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] px-4 text-[13px] font-semibold text-[var(--foreground)] hover:border-[var(--border-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                onClick={() => {
                  setConfirmingPause(false);
                  triggerRef.current?.focus();
                }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="min-h-11 rounded-[var(--radius-control)] bg-[var(--primary)] px-4 text-[13px] font-semibold text-white hover:bg-[var(--primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                onClick={() => void updatePause(true)}
                ref={confirmRef}
                type="button"
              >
                Pause future emails
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
