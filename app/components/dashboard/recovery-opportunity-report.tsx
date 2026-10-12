import Link from "next/link";
import type { RecoveryOpportunityReport } from "../../lib/recovery/opportunity-report";

function formatDate(value: string | null) {
  if (!value) return "Connection-time snapshot";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function RecoveryOpportunityReportCard({
  report,
}: {
  report: RecoveryOpportunityReport;
}) {
  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]" aria-labelledby="opportunity-report-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.04em] text-[var(--muted)]">Diagnose</p>
          <h2 className="mt-2 text-base font-medium text-[var(--foreground)]" id="opportunity-report-heading">Stripe opportunity snapshot</h2>
          <p className="mt-2 max-w-2xl text-sm leading-5 text-[var(--muted-strong)]">
            See the failed-payment opportunity RevRecovery found when this Stripe account was connected.
          </p>
        </div>
        {report.state === "available" ? (
          <p className="text-xs text-[var(--muted)]">Scanned {formatDate(report.lastSyncedAt)}</p>
        ) : null}
      </div>

      {report.state === "available" ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] p-4">
            <p className="text-xs text-[var(--muted)]">Revenue at risk</p>
            <p className="mt-2 text-xl font-medium text-[var(--foreground)]">{report.revenueAtRisk}</p>
          </div>
          <div className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] p-4">
            <p className="text-xs text-[var(--muted)]">Failed invoices found</p>
            <p className="mt-2 text-xl font-medium text-[var(--foreground)]">{report.failedPaymentsCount}</p>
          </div>
          <div className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] p-4">
            <p className="text-xs text-[var(--muted)]">Customers at risk</p>
            <p className="mt-2 text-xl font-medium text-[var(--foreground)]">{report.atRiskCustomersCount}</p>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-[var(--radius-control)] border border-dashed border-[var(--border-strong)] bg-[var(--background)] p-5">
          <p className="text-sm text-[var(--muted-strong)]">{report.scopeNote}</p>
          {!report.connected ? (
            <Link className="mt-3 inline-flex text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]" href="/dashboard/settings">
              Connect Stripe in settings
            </Link>
          ) : null}
        </div>
      )}

      {report.state === "available" ? (
        <p className="mt-4 text-xs leading-5 text-[var(--muted)]">{report.scopeNote}</p>
      ) : null}
    </section>
  );
}
