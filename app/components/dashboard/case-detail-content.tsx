import Link from "next/link";
import type { RecoveryCaseListItem } from "../../lib/server/recovery-cases";
import type { RecoveryCaseTimelineEvent } from "../../lib/server/recovery-case-events";
import { buildRecoveryCaseTimelineView } from "../../lib/recovery/case-timeline-view";

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
          <SummaryCard label="Next RevRecovery email" value={formatDate(recoveryCase.nextEmailAt)} detail={`Current stage: ${formatLabel(recoveryCase.recoveryStage)}`} />
        </section>

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
