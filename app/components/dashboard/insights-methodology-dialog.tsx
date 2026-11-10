"use client";

import { useId, useRef } from "react";
import { Icon } from "../ui-icon";

type InsightsMethodologyDialogProps = {
  variant?: "button" | "link";
};

export function InsightsMethodologyDialog({
  variant = "button",
}: InsightsMethodologyDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  function openDialog() {
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        className={
          variant === "link"
            ? "w-fit text-left font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
            : "inline-flex h-9 w-fit items-center justify-center rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3.5 text-sm font-medium text-[var(--text-subtle)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
        }
        onClick={openDialog}
        type="button"
      >
        How these numbers work
      </button>

      <dialog
        aria-labelledby={titleId}
        className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-0 text-[var(--foreground)] shadow-[var(--shadow-card)] backdrop:bg-[var(--overlay)]"
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDialog();
        }}
        ref={dialogRef}
      >
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-[var(--border)] bg-[var(--surface)] px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.02em]" id={titleId}>
              How these numbers work
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              A short guide to what is included and what the figures can support.
            </p>
          </div>
          <button
            aria-label="Close how these numbers work"
            className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-[var(--muted-strong)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
            onClick={closeDialog}
            type="button"
          >
            <Icon className="size-4" name="x" />
          </button>
        </div>

        <div className="grid gap-5 px-5 py-5 sm:px-6 sm:py-6">
          <section>
            <h3 className="text-sm font-semibold">What is included</h3>
            <p className="mt-1 text-sm leading-6 text-[var(--muted-strong)]">
              Failed-payment cases first recorded in the selected period, environment and audience, together with their recorded message, engagement and payment outcomes.
            </p>
          </section>

          <section className="border-t border-[var(--border)] pt-5">
            <h3 className="text-sm font-semibold">When comparisons appear</h3>
            <p className="mt-1 text-sm leading-6 text-[var(--muted-strong)]">
              Period comparisons appear after both periods contain at least 30 cases, at least 80% have reached a final outcome, and the selected records have usable environment, amount and currency information.
            </p>
          </section>

          <section className="border-t border-[var(--border)] pt-5">
            <h3 className="text-sm font-semibold">What the figures cannot prove</h3>
            <p className="mt-1 text-sm leading-6 text-[var(--muted-strong)]">
              Reporting is descriptive, not causal. A message occurring before a recovery does not prove it caused the recovery, and amounts due at failure are not automatically confirmed collected revenue.
            </p>
          </section>
        </div>

        <div className="flex justify-end border-t border-[var(--border)] bg-[var(--surface-muted)] px-5 py-4 sm:px-6">
          <button
            className="inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
            onClick={closeDialog}
            type="button"
          >
            Got it
          </button>
        </div>
      </dialog>
    </>
  );
}
