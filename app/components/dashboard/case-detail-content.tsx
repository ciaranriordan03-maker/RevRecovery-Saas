import Link from "next/link";
import type { RecoveryCaseListItem } from "../../lib/server/recovery-cases";
import type { RecoveryCaseTimelineEvent } from "../../lib/server/recovery-case-events";
import { buildRecoveryCaseTimelineView } from "../../lib/recovery/case-timeline-view";
import { buildFailureSpecificEmailPreview } from "../../lib/recovery/failure-specific-email-preview";
import { evaluateRetryEmailOverlap } from "../../lib/recovery/retry-email-overlap";
import { CaseManualActions } from "./case-manual-actions";

function formatCurrency(amount: number, currency: string | null) {
  if (!currency) return `${(amount / 100).toLocaleString()} (currency unknown)`;
  return new Intl.NumberFormat("en-US", {
    currency: currency.toUpperCase(),
    style: "currency",
  }).format(amount / 100);
}

function formatDate(value: string | null) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatLabel(value: string | null) {
  if (!value) return "Unknown";
  return value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function toneClass(tone: "danger" | "neutral" | "success" | "warning") {
  if (tone === "success") return "border-[var(--success)] bg-[var(--success-soft)]";
  if (tone === "warning") return "border-[var(--warning-text)] bg-[var(--warning-soft)]";
  if (tone === "danger") return "border-[var(--danger)] bg-[var(--danger-soft)]";
  return "border-[var(--border-strong)] bg-[var(--surface-muted)]";
}

function attentionClass(level: "critical" | "warning") {
  return level === "critical"
    ? "border-[var(--danger)] bg-[var(--danger-soft)]"
    : "border-[var(--warning-text)] bg-[var(--warning-soft)]";
}

function SummaryCard({ label, value, detail }: { detail?: string; label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]">
      <p className="text-xs font-medium uppercase tracking-[0.04em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-base font-medium text-[var(--foreground)]">{value}</p>
      {detail ? <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{detail}</p> : null}
    </div>
  );
}

export function CaseDetailContent({
  recoveryCase,
  timeline,
}: {
  recoveryCase: RecoveryCaseListItem;
  timeline: RecoveryCaseTimelineEvent[];
}) {
  const customer = recoveryCase.customerEmail ?? recoveryCase.customerId ?? "Unknown customer";
  const canControlEmails = ![
    "canceled_by_merchant",
    "exhausted",
    "no_longer_applicable",
    "recovered",
  ].includes(recoveryCase.caseStatus) && recoveryCase.caseStatus !== "detected";
  const emailStageDetail = recoveryCase.manuallyPausedAt
    ? "Recovery emails manually paused"
    : recoveryCase.nextEmailAt === null && recoveryCase.caseStatus === "detected"
      ? "No recovery email has been scheduled"
      : `Current stage: ${formatLabel(recoveryCase.recoveryStage)}`;
  const emailPreview = buildFailureSpecificEmailPreview({
    category: recoveryCase.failureCategory,
    nextRetryLabel: recoveryCase.nextPaymentAttemptAt
      ? formatDate(recoveryCase.nextPaymentAttemptAt)
      : null,
  });
  const retryEmailOverlap = evaluateRetryEmailOverlap({
    nextEmailAt: recoveryCase.nextEmailAt,
    nextPaymentAttemptAt: recoveryCase.nextPaymentAttemptAt,
  });

  return (
    <div className="px-5 py-8 sm:px-8">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-6">
        <div>
          <Link className="text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]" href="/dashboard/cases">← Back to cases</Link>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-[var(--muted)]">{recoveryCase.invoiceId}</p>
              <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)]">{customer}</h2>
            </div>
            <span className="w-fit rounded bg-[var(--primary-soft)] px-2.5 py-1.5 text-xs font-medium text-[var(--primary-text)]">{formatLabel(recoveryCase.caseStatus)}</span>
          </div>
        </div>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Amount at risk" value={formatCurrency(recoveryCase.amountDue, recoveryCase.currency)} />
          <SummaryCard label="Failure reported" value={recoveryCase.failureTitle} detail={recoveryCase.failureExplanation} />
          <SummaryCard label="Stripe retry" value={formatDate(recoveryCase.nextPaymentAttemptAt)} detail={`${recoveryCase.attemptCount} payment ${recoveryCase.attemptCount === 1 ? "attempt" : "attempts"} recorded`} />
          <SummaryCard
            label="Next RevRecovery email"
            value={formatDate(recoveryCase.nextEmailAt)}
            detail={emailStageDetail}
          />
        </section>

        <section className={`rounded-[var(--radius-card)] border-l-4 p-5 ${retryEmailOverlap.status === "review" ? "border-[var(--warning-text)] bg-[var(--warning-soft)]" : retryEmailOverlap.status === "clear" ? "border-[var(--success)] bg-[var(--success-soft)]" : "border-[var(--border-strong)] bg-[var(--surface)] shadow-[var(--shadow-card)]"}`} aria-labelledby="retry-coordination-heading">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.04em] text-[var(--muted)]">Stripe coordination</p>
              <h2 className="mt-2 text-base font-medium text-[var(--foreground)]" id="retry-coordination-heading">{retryEmailOverlap.title}</h2>
              <p className="mt-1 max-w-3xl text-sm leading-5 text-[var(--muted-strong)]">{retryEmailOverlap.detail}</p>
            </div>
            <span className="w-fit rounded bg-[var(--surface)] px-2 py-1 text-xs font-medium text-[var(--muted-strong)]">Read only</span>
          </div>
          <p className="mt-4 text-xs leading-5 text-[var(--muted)]">RevRecovery has not changed the email schedule or Stripe&apos;s retry configuration.</p>
        </section>

        {recoveryCase.attentionFlags.length > 0 ? (
          <section aria-labelledby="attention-heading" className="space-y-3">
            <div>
              <h2 className="text-base font-medium text-[var(--foreground)]" id="attention-heading">Needs attention</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Explainable flags based only on the case and delivery facts recorded below.</p>
            </div>
            {recoveryCase.attentionFlags.map((flag) => (
              <div className={`rounded-[var(--radius-card)] border-l-4 p-4 ${attentionClass(flag.level)}`} key={flag.code}>
                <p className="text-sm font-medium text-[var(--foreground)]">{flag.title}</p>
                <p className="mt-1 text-sm leading-5 text-[var(--muted-strong)]">{flag.explanation}</p>
              </div>
            ))}
          </section>
        ) : null}

        <section className="rounded-[var(--radius-card)] border border-[var(--primary-border)] bg-[var(--primary-soft)] p-5" aria-labelledby="communication-guidance-heading">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.04em] text-[var(--primary-text)]">Recover</p>
            <h2 className="mt-2 text-base font-medium text-[var(--foreground)]" id="communication-guidance-heading">Communication guidance</h2>
            <p className="mt-1 text-sm leading-5 text-[var(--muted-strong)]">Use Stripe&apos;s reported failure reason to communicate clearly without guessing or overpromising.</p>
          </div>
          <dl className="mt-5 grid gap-4 lg:grid-cols-3">
            <div className="rounded-[var(--radius-control)] border border-[var(--primary-border)] bg-[var(--surface)] p-4">
              <dt className="text-xs font-medium text-[var(--muted)]">What the customer should do</dt>
              <dd className="mt-2 text-sm leading-5 text-[var(--foreground)]">{recoveryCase.customerAction}</dd>
            </div>
            <div className="rounded-[var(--radius-control)] border border-[var(--primary-border)] bg-[var(--surface)] p-4">
              <dt className="text-xs font-medium text-[var(--muted)]">What your team should do</dt>
              <dd className="mt-2 text-sm leading-5 text-[var(--foreground)]">{recoveryCase.merchantAction}</dd>
            </div>
            <div className="rounded-[var(--radius-control)] border border-[var(--primary-border)] bg-[var(--surface)] p-4">
              <dt className="text-xs font-medium text-[var(--muted)]">How to describe the retry</dt>
              <dd className="mt-2 text-sm leading-5 text-[var(--foreground)]">{recoveryCase.retryGuidance}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-5 text-[var(--muted)]">Advisory only. RevRecovery has not changed this case&apos;s saved message copy or Stripe retry schedule.</p>
        </section>

        <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]" aria-labelledby="email-recommendation-heading">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.04em] text-[var(--muted)]">Preview only</p>
              <h2 className="mt-2 text-base font-medium text-[var(--foreground)]" id="email-recommendation-heading">Suggested first-email treatment</h2>
              <p className="mt-1 max-w-2xl text-sm leading-5 text-[var(--muted-strong)]">Recommended wording for this failure category. Review it before deciding whether it should influence automated messages.</p>
            </div>
            <span className="w-fit rounded bg-[var(--surface-muted)] px-2 py-1 text-xs font-medium text-[var(--muted-strong)]">Not saved</span>
          </div>
          <div className="mt-5 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] p-5">
            <p className="text-xs text-[var(--muted)]">Suggested subject</p>
            <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{emailPreview.subject}</p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted-strong)]">
              <p>Hi [customer first name],</p>
              <p>{emailPreview.contextLine}</p>
              <p>{emailPreview.actionLine}</p>
              <p>{emailPreview.retryLine}</p>
              <p>[Secure Stripe invoice link]</p>
            </div>
          </div>
          <div className="mt-4 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
            <p className="text-xs font-medium text-[var(--foreground)]">Why this treatment</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">{emailPreview.rationale}</p>
          </div>
          <p className="mt-4 text-xs leading-5 text-[var(--muted)]">This preview does not modify the account template, this case&apos;s sequence, or email delivery.</p>
        </section>

        {canControlEmails ? (
          <CaseManualActions
            failedPaymentId={recoveryCase.id}
            manuallyPausedAt={recoveryCase.manuallyPausedAt}
          />
        ) : null}

        <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-base font-medium text-[var(--foreground)]">Case facts</h2>
          <dl className="mt-4 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div><dt className="text-[var(--muted)]">Audience</dt><dd className="mt-1 font-medium text-[var(--foreground)]">{formatLabel(recoveryCase.audienceSegment)}</dd></div>
            <div><dt className="text-[var(--muted)]">Stripe invoice status</dt><dd className="mt-1 font-medium text-[var(--foreground)]">{formatLabel(recoveryCase.invoiceStatus)}</dd></div>
            <div><dt className="text-[var(--muted)]">Environment</dt><dd className="mt-1 font-medium text-[var(--foreground)]">{recoveryCase.livemode === null ? "Unknown" : recoveryCase.livemode ? "Live" : "Test"}</dd></div>
            <div><dt className="text-[var(--muted)]">Case opened</dt><dd className="mt-1 font-medium text-[var(--foreground)]">{formatDate(recoveryCase.createdAt)}</dd></div>
            <div><dt className="text-[var(--muted)]">Last updated</dt><dd className="mt-1 font-medium text-[var(--foreground)]">{formatDate(recoveryCase.updatedAt)}</dd></div>
            <div><dt className="text-[var(--muted)]">Recovered</dt><dd className="mt-1 font-medium text-[var(--foreground)]">{recoveryCase.recoveredAt ? formatDate(recoveryCase.recoveredAt) : "Not yet recovered"}</dd></div>
          </dl>
        </section>

        <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
          <div>
            <h2 className="text-base font-medium text-[var(--foreground)]">Recovery timeline</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">A chronological record of facts received from Stripe, RevRecovery, and the email provider.</p>
          </div>
          {timeline.length === 0 ? (
            <div className="mt-5 rounded-[var(--radius-control)] border border-dashed border-[var(--border-strong)] p-6 text-sm text-[var(--muted)]">No historical timeline events are available for this case. Older cases may predate event tracking.</div>
          ) : (
            <ol className="mt-6 space-y-4">
              {timeline.map((event) => {
                const view = buildRecoveryCaseTimelineView(event);
                return (
                  <li className="grid grid-cols-[12px_1fr] gap-4" key={view.id}>
                    <span className={`mt-1.5 size-3 rounded-full border-2 ${toneClass(view.tone)}`} />
                    <div className="border-b border-[var(--border)] pb-4 last:border-0">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <h3 className="text-sm font-medium text-[var(--foreground)]">{view.title}</h3>
                        <time className="text-xs text-[var(--muted)]" dateTime={view.occurredAt}>{formatDate(view.occurredAt)}</time>
                      </div>
                      <p className="mt-1 text-sm leading-5 text-[var(--muted-strong)]">{view.detail}</p>
                      <p className="mt-2 text-xs text-[var(--muted)]">Source: {view.sourceLabel}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
