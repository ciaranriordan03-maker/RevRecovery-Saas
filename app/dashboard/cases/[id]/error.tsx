"use client";

import {
  CaseDetailFeedback,
  CaseDetailFrame,
  CaseDetailHeader,
} from "../../../components/dashboard/case-detail-frame";

export default function RecoveryCaseError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <CaseDetailFrame>
      <CaseDetailHeader />
      <CaseDetailFeedback
        action={
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border)] px-4 text-[13px] font-semibold text-[var(--foreground)] hover:border-[var(--border-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
            onClick={reset}
            type="button"
          >
            Try again
          </button>
        }
        body="We couldn’t load this case. Refresh the page to try again. Your saved recovery data has not changed."
        title="Case details unavailable"
      />
    </CaseDetailFrame>
  );
}
