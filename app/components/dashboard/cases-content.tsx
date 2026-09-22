import Link from "next/link";
import type {
  RecoveryCaseFilters,
  RecoveryCaseListItem,
  RecoveryCasesPage,
} from "../../lib/server/recovery-cases";

const controlClass =
  "h-10 rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]";

function formatCurrency(amount: number, currency: string | null) {
  if (!currency) {
    return `${(amount / 100).toLocaleString()} (currency unknown)`;
  }

  return new Intl.NumberFormat("en-US", {
    currency: currency.toUpperCase(),
    style: "currency",
  }).format(amount / 100);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatLabel(value: string | null) {
  if (!value) return "Unknown";
  return value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function getCustomerLabel(item: RecoveryCaseListItem) {
  return item.customerEmail ?? item.customerId ?? "Unknown customer";
}

function getStatusClass(status: string) {
  if (status === "recovered") {
    return "bg-[var(--success-soft)] text-[var(--success-badge-text)]";
  }
  if (status === "exhausted" || status === "failed_operationally") {
    return "bg-[var(--warning-soft)] text-[var(--warning-text)]";
  }
  return "bg-[var(--primary-soft)] text-[var(--primary-text)]";
}

function getEnvironmentLabel(livemode: boolean | null) {
  if (livemode === null) return "Unknown environment";
  return livemode ? "Live" : "Test";
}

function getAttentionClass(level: RecoveryCaseListItem["attentionLevel"]) {
  return level === "critical"
    ? "bg-[var(--danger-soft)] text-[var(--danger)]"
    : "bg-[var(--warning-soft)] text-[var(--warning-text)]";
}

function filterHref(filters: RecoveryCaseFilters, page: number) {
  const params = new URLSearchParams({
    environment: filters.environment,
    page: String(page),
    segment: filters.segment,
    status: filters.status,
  });
  if (filters.currency) params.set("currency", filters.currency);
  if (filters.minimumAmountInput) params.set("minimumAmount", filters.minimumAmountInput);
  return `/dashboard/cases?${params.toString()}`;
}

function CasesFilters({ filters }: { filters: RecoveryCaseFilters }) {
  return (
    <form className="grid gap-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)] md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_0.7fr_0.8fr_auto_auto] xl:items-end" method="get">
      <label className="text-xs font-medium text-[var(--muted-strong)]">
        Case status
        <select className={`${controlClass} mt-2 w-full`} defaultValue={filters.status} name="status">
          <option value="open">Open cases</option>
          <option value="attention">Needs attention</option>
          <option value="all">All cases</option>
          <option value="recovered">Recovered</option>
          <option value="exhausted">Sequence exhausted</option>
          <option value="failed_operationally">Operational failure</option>
        </select>
      </label>
      <label className="text-xs font-medium text-[var(--muted-strong)]">
        Audience
        <select className={`${controlClass} mt-2 w-full`} defaultValue={filters.segment} name="segment">
          <option value="all">All audiences</option>
          <option value="subscription">Subscriptions</option>
          <option value="standalone">Standalone invoices</option>
          <option value="unknown">Unknown invoice type</option>
        </select>
      </label>
      <label className="text-xs font-medium text-[var(--muted-strong)]">
        Stripe environment
        <select className={`${controlClass} mt-2 w-full`} defaultValue={filters.environment} name="environment">
          <option value="all">All environments</option>
          <option value="live">Live</option>
          <option value="test">Test</option>
          <option value="unknown">Unknown</option>
        </select>
      </label>
      <label className="text-xs font-medium text-[var(--muted-strong)]">
        Value currency
        <input className={`${controlClass} mt-2 w-full uppercase`} defaultValue={filters.currency ?? ""} maxLength={3} name="currency" pattern="[A-Za-z]{3}" placeholder="EUR" />
      </label>
      <label className="text-xs font-medium text-[var(--muted-strong)]">
        Minimum value
        <input className={`${controlClass} mt-2 w-full`} defaultValue={filters.minimumAmountInput} inputMode="decimal" min="0.01" name="minimumAmount" placeholder="500.00" step="0.01" type="number" />
      </label>
      <button className="h-10 rounded-[var(--radius-control)] bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)]" type="submit">
        Apply filters
      </button>
      <Link className="inline-flex h-10 items-center justify-center px-2 text-sm font-medium text-[var(--muted-strong)] hover:text-[var(--foreground)]" href="/dashboard/cases">
        Clear
      </Link>
      <p className="text-xs leading-5 text-[var(--muted)] md:col-span-2 xl:col-span-7">High value is never assumed across currencies. Enter a three-letter currency and your own threshold to filter and rank comparable cases.</p>
    </form>
  );
}

function CasesTable({
  cases,
  highValueActive,
}: {
  cases: RecoveryCaseListItem[];
  highValueActive: boolean;
}) {
  if (cases.length === 0) {
    return (
      <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] px-6 py-14 text-center shadow-[var(--shadow-card)]">
        <h2 className="text-base font-medium text-[var(--foreground)]">No cases match these filters</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Adjust the filters or wait for Stripe to report a failed payment.</p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1320px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-xs font-medium uppercase tracking-[0.04em] text-[var(--muted)]">
              <th className="px-5 py-3">Customer</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Failure</th>
              <th className="px-4 py-3">Attention</th>
              <th className="px-4 py-3">Attempts</th>
              <th className="px-4 py-3">Next action</th>
              <th className="px-4 py-3">Audience</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {cases.map((item) => (
              <tr key={item.id}>
                <td className="px-5 py-4 align-top">
                  <Link className="block max-w-[210px] truncate text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]" href={`/dashboard/cases/${item.id}`}>{getCustomerLabel(item)}</Link>
                  <p className="mt-1 max-w-[210px] truncate text-xs text-[var(--muted)]">{item.invoiceId}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{getEnvironmentLabel(item.livemode)}</p>
                </td>
                <td className="px-4 py-4 align-top text-sm font-medium text-[var(--foreground)]">
                  {formatCurrency(item.amountDue, item.currency)}
                  {highValueActive ? <span className="mt-2 block w-fit rounded bg-[var(--primary-soft)] px-2 py-1 text-xs font-medium text-[var(--primary-text)]">High value</span> : null}
                </td>
                <td className="px-4 py-4 align-top">
                  <p className="max-w-[220px] text-sm font-medium text-[var(--foreground)]">{item.failureTitle}</p>
                  <p className="mt-1 max-w-[260px] text-xs leading-4 text-[var(--muted)]">{item.failureExplanation}</p>
                </td>
                <td className="px-4 py-4 align-top">
                  {item.attentionFlags.length > 0 ? (
                    <div>
                      <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${getAttentionClass(item.attentionLevel)}`}>{item.attentionFlags[0].title}</span>
                      {item.attentionFlags.length > 1 ? <p className="mt-1 text-xs text-[var(--muted)]">+{item.attentionFlags.length - 1} more {item.attentionFlags.length === 2 ? "flag" : "flags"}</p> : null}
                    </div>
                  ) : <span className="text-xs text-[var(--muted)]">No attention flag</span>}
                </td>
                <td className="px-4 py-4 align-top">
                  <p className="text-sm text-[var(--foreground)]">{item.attemptCount}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">Stripe retry: {formatDate(item.nextPaymentAttemptAt)}</p>
                </td>
                <td className="px-4 py-4 align-top">
                  <p className="text-sm text-[var(--foreground)]">{item.manuallyPausedAt ? "Manually paused" : formatLabel(item.recoveryStage)}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">Email: {formatDate(item.nextEmailAt)}</p>
                </td>
                <td className="px-4 py-4 align-top text-sm text-[var(--muted-strong)]">{formatLabel(item.audienceSegment)}</td>
                <td className="px-5 py-4 align-top">
                  <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${getStatusClass(item.caseStatus)}`}>{formatLabel(item.caseStatus)}</span>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    {item.recoveredAt
                      ? `Recovered ${formatDate(item.recoveredAt)}`
                      : `Stripe: ${formatLabel(item.invoiceStatus)}`}
                  </p>
                  <p className="mt-2 text-xs text-[var(--muted)]">Updated {formatDate(item.updatedAt)}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function CasesContent({ page }: { page: RecoveryCasesPage }) {
  const highValueActive = page.filters.currency !== null && page.filters.minimumAmountCents !== null;
  return (
    <div className="px-5 py-8 sm:px-8">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-6">
        <section className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-medium text-[var(--foreground)]">Failed-payment cases</h2>
            <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">{page.filters.status === "attention" ? "Cases with an exhausted or failed recovery flow, or a recorded email-delivery problem." : "Review what Stripe reported, what it plans to do next, and where the recovery flow currently stands."}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-[var(--muted-strong)]">{page.totalCount} matching {page.totalCount === 1 ? "case" : "cases"}</p>
            {highValueActive ? <p className="mt-1 text-xs text-[var(--muted)]">{page.filters.currency?.toUpperCase()} {page.filters.minimumAmountInput}+ · highest value first</p> : null}
          </div>
        </section>
        <CasesFilters filters={page.filters} />
        <CasesTable cases={page.cases} highValueActive={highValueActive} />
        {page.pageCount > 1 ? (
          <nav aria-label="Cases pagination" className="flex items-center justify-between">
            {page.filters.page > 1 ? <Link className="text-sm font-medium text-[var(--primary)]" href={filterHref(page.filters, page.filters.page - 1)}>Previous</Link> : <span />}
            <p className="text-sm text-[var(--muted)]">Page {page.filters.page} of {page.pageCount}</p>
            {page.filters.page < page.pageCount ? <Link className="text-sm font-medium text-[var(--primary)]" href={filterHref(page.filters, page.filters.page + 1)}>Next</Link> : <span />}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
