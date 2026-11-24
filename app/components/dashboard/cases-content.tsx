import Link from "next/link";
import { formatCurrencyAmounts } from "../../lib/currency";
import { getCasesEnvironmentLabel, getCasesHref } from "../../lib/cases-query";
import type {
  RecoveryCaseListItem,
  RecoveryCasesPage,
} from "../../lib/server/recovery-cases";
import { Icon } from "../ui-icon";
import { CasesFilters } from "./cases-filters";

const cardClass =
  "rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)]";

function formatCurrency(item: RecoveryCaseListItem) {
  return formatCurrencyAmounts([{ amount: item.amountDue, currency: item.currency }]);
}

function formatDate(value: string | null) {
  if (!value) return "Not scheduled";

  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatLabel(value: string | null) {
  if (!value) return "Unknown";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getCustomerLabel(item: RecoveryCaseListItem) {
  return item.customerEmail ?? item.customerId ?? "Customer details unavailable";
}

function getCustomerInitial(item: RecoveryCaseListItem) {
  const label = getCustomerLabel(item).trim();
  return label.charAt(0).toUpperCase() || "?";
}

function getEnvironmentLabel(livemode: boolean | null) {
  if (livemode === null) return "Unknown environment";
  return livemode ? "Live" : "Test";
}

function getStatusLabel(status: string) {
  if (status === "failed_operationally") return "Operational failure";
  if (status === "exhausted") return "Sequence exhausted";
  return formatLabel(status);
}

function getStatusStyle(status: string) {
  if (status === "recovered") {
    return {
      className: "bg-[var(--success-soft)] text-[var(--success)]",
      dotClassName: "bg-[var(--success)]",
    };
  }
  if (status === "failed_operationally") {
    return {
      className: "bg-[var(--danger-soft)] text-[var(--danger)]",
      dotClassName: "bg-[var(--danger)]",
    };
  }
  if (status === "exhausted") {
    return {
      className: "bg-[var(--warning-soft)] text-[var(--warning-text)]",
      dotClassName: "bg-[var(--warning-text)]",
    };
  }
  if (status === "detected") {
    return {
      className: "bg-[var(--surface-muted)] text-[var(--muted-strong)]",
      dotClassName: "bg-[var(--muted)]",
    };
  }
  return {
    className: "bg-[var(--primary-soft)] text-[var(--primary-text)]",
    dotClassName: "bg-[var(--primary)]",
  };
}

function StatusBadge({ status }: { status: string }) {
  const style = getStatusStyle(status);

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-xs font-semibold ${style.className}`}
    >
      <span aria-hidden className={`size-[5px] rounded-full ${style.dotClassName}`} />
      {getStatusLabel(status)}
    </span>
  );
}

function EnvironmentBadge({ livemode }: { livemode: boolean | null }) {
  return (
    <span className="inline-flex w-fit rounded-[5px] border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--muted)]">
      {getEnvironmentLabel(livemode)}
    </span>
  );
}

function AttentionSummary({ item }: { item: RecoveryCaseListItem }) {
  const firstFlag = item.attentionFlags[0];

  if (!firstFlag) {
    return <p className="text-xs text-[var(--muted)]">No action needed</p>;
  }

  const critical = item.attentionLevel === "critical";

  return (
    <div>
      <span
        className={`inline-flex rounded-[6px] px-2.5 py-1 text-xs font-semibold ${
          critical
            ? "bg-[var(--danger-soft)] text-[var(--danger)]"
            : "bg-[var(--warning-soft)] text-[var(--warning-text)]"
        }`}
      >
        {firstFlag.title}
      </span>
      {item.attentionFlags.length > 1 ? (
        <p className="mt-1.5 text-xs text-[var(--muted)]">
          +{item.attentionFlags.length - 1} more
        </p>
      ) : null}
    </div>
  );
}

function RecoveryActivity({ item }: { item: RecoveryCaseListItem }) {
  const stage = item.manuallyPausedAt
    ? "Manually paused"
    : formatLabel(item.recoveryStage);

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-[7px] bg-[var(--primary-soft)] text-[var(--primary-text)]">
          <Icon className="size-3.5" name="flow" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-[var(--foreground)]">{stage}</p>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">
            {item.attemptCount} payment {item.attemptCount === 1 ? "attempt" : "attempts"}
          </p>
        </div>
      </div>

      <div className="relative ml-3.5 mt-3 space-y-2.5 border-l border-[var(--border-strong)] pl-4">
        <div className="relative">
          <span aria-hidden className="absolute -left-[19px] top-1 size-1.5 rounded-full bg-[var(--primary)] ring-2 ring-[var(--surface)]" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--muted)]">Stripe retry</p>
          <p className="mt-0.5 text-[11px] leading-4 text-[var(--muted-strong)]">
            {formatDate(item.nextPaymentAttemptAt)}
          </p>
        </div>
        <div className="relative">
          <span aria-hidden className="absolute -left-[19px] top-1 size-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--surface)] ring-2 ring-[var(--surface)]" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--muted)]">Next email</p>
          <p className="mt-0.5 text-[11px] leading-4 text-[var(--muted-strong)]">
            {formatDate(item.nextEmailAt)}
          </p>
        </div>
      </div>
    </div>
  );
}

function PaymentIssue({ item }: { item: RecoveryCaseListItem }) {
  const hasAttention = item.attentionFlags.length > 0;

  return (
    <div>
      <div className="flex items-start gap-2.5">
        <span
          className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[7px] ${
            hasAttention
              ? "bg-[var(--warning-soft)] text-[var(--warning-text)]"
              : "bg-[var(--surface-muted)] text-[var(--muted-strong)]"
          }`}
        >
          <Icon className="size-3.5" name={hasAttention ? "alert" : "card"} />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold leading-[18px] text-[var(--foreground)]">
            {item.failureTitle}
          </p>
          <p className="mt-1 max-w-[250px] text-[11px] leading-[17px] text-[var(--muted)]">
            {item.failureExplanation}
          </p>
        </div>
      </div>
      <div className="mt-3 pl-[38px]">
        <AttentionSummary item={item} />
      </div>
    </div>
  );
}

function DesktopCases({
  cases,
  highValueActive,
}: {
  cases: RecoveryCaseListItem[];
  highValueActive: boolean;
}) {
  return (
    <div className="hidden overflow-x-auto lg:block">
      <table className="w-full min-w-[980px] border-collapse text-left">
        <thead>
          <tr className="border-y border-[var(--border)] bg-[var(--surface-muted)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            <th className="w-[25%] px-5 py-3.5" scope="col">Customer / amount</th>
            <th className="w-[26%] px-4 py-3.5" scope="col">Payment issue</th>
            <th className="w-[23%] px-4 py-3.5" scope="col">Recovery activity</th>
            <th className="w-[17%] px-4 py-3.5" scope="col">Status</th>
            <th className="w-[9%] px-5 py-3.5 text-right" scope="col">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {cases.map((item) => (
            <tr className="group motion-safe:transition-colors motion-safe:duration-150 hover:bg-[var(--surface-muted)]" key={item.id}>
              <td className="px-5 py-[18px] align-top">
                <div className="flex items-start gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] border border-[var(--primary-border)] bg-[var(--primary-soft)] text-xs font-bold text-[var(--primary-text)]">
                    {getCustomerInitial(item)}
                  </span>
                  <div className="min-w-0">
                    <Link
                      className="block max-w-[200px] truncate rounded-sm text-[13px] font-semibold text-[var(--foreground)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                      href={`/dashboard/cases/${item.id}`}
                    >
                      {getCustomerLabel(item)}
                    </Link>
                    <p className="mt-1 max-w-[200px] truncate text-[11px] text-[var(--muted)]">
                      {item.invoiceId}
                    </p>
                  </div>
                </div>
                <div className="mt-3.5 flex flex-wrap items-center gap-2 pl-11">
                  <p className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--foreground)]">
                    {formatCurrency(item)}
                  </p>
                  <EnvironmentBadge livemode={item.livemode} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-11">
                  {highValueActive ? (
                    <span className="inline-flex rounded-[5px] bg-[var(--primary-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--primary-text)]">
                      Meets threshold
                    </span>
                  ) : null}
                  <span className="text-[11px] text-[var(--muted)]">
                    {formatLabel(item.audienceSegment)}
                  </span>
                </div>
              </td>
              <td className="px-4 py-[18px] align-top">
                <PaymentIssue item={item} />
              </td>
              <td className="px-4 py-[18px] align-top">
                <RecoveryActivity item={item} />
              </td>
              <td className="px-4 py-[18px] align-top">
                <StatusBadge status={item.caseStatus} />
                <div className="mt-3 border-l-2 border-[var(--border)] pl-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--muted)]">
                    Stripe invoice
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-[var(--muted-strong)]">
                    {formatLabel(item.invoiceStatus)}
                  </p>
                  <p className="mt-2 text-[10px] leading-4 text-[var(--muted)]">
                    Updated {formatDate(item.updatedAt)}
                  </p>
                </div>
              </td>
              <td className="px-5 py-[18px] text-right align-top">
                <Link
                  aria-label={`Review case for ${getCustomerLabel(item)}`}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--muted-strong)] shadow-[var(--shadow-subtle)] motion-safe:transition-all motion-safe:duration-150 hover:border-[var(--primary-border)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] group-hover:border-[var(--border-strong)]"
                  href={`/dashboard/cases/${item.id}`}
                >
                  Review
                  <Icon className="size-3.5" name="arrow-right" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetailFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--muted)]">
        {label}
      </dt>
      <dd className="mt-1 break-words text-xs leading-5 text-[var(--foreground)]">
        {value}
      </dd>
    </div>
  );
}

function MobileCaseCard({
  highValueActive,
  item,
}: {
  highValueActive: boolean;
  item: RecoveryCaseListItem;
}) {
  const stage = item.manuallyPausedAt
    ? "Manually paused"
    : formatLabel(item.recoveryStage);

  return (
    <article className={`${cardClass} p-4`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-[var(--foreground)]">
            {getCustomerLabel(item)}
          </p>
          <p className="mt-1 truncate text-xs text-[var(--muted)]">{item.invoiceId}</p>
        </div>
        <p className="shrink-0 text-base font-semibold text-[var(--foreground)]">
          {formatCurrency(item)}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={item.caseStatus} />
        <EnvironmentBadge livemode={item.livemode} />
        {highValueActive ? (
          <span className="inline-flex rounded-[5px] bg-[var(--primary-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--primary-text)]">
            Meets threshold
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3">
        <div>
          <p className="text-xs font-semibold text-[var(--foreground)]">{item.failureTitle}</p>
          <p className="mt-1 text-xs leading-[18px] text-[var(--muted)]">
            {item.failureExplanation}
          </p>
        </div>
        <AttentionSummary item={item} />
        <div className="rounded-[8px] bg-[var(--surface-muted)] px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--muted)]">
            Recovery activity
          </p>
          <p className="mt-1 text-xs font-semibold text-[var(--foreground)]">{stage}</p>
        </div>
      </div>

      <Link
        className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-[var(--primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
        href={`/dashboard/cases/${item.id}`}
      >
        Review case
        <Icon className="size-4" name="arrow-right" />
      </Link>

      <details className="group mt-2 border-t border-[var(--border)] pt-2">
        <summary className="flex min-h-9 list-none items-center justify-center gap-1.5 text-xs font-semibold text-[var(--muted-strong)] [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">More details</span>
          <span className="hidden group-open:inline">Hide details</span>
          <Icon className="size-3.5 transition-transform group-open:rotate-180" name="chevron-down" />
        </summary>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 border-t border-[var(--border)] pt-4">
          <DetailFact label="Invoice ID" value={item.invoiceId} />
          <DetailFact label="Audience" value={formatLabel(item.audienceSegment)} />
          <DetailFact label="Payment attempts" value={String(item.attemptCount)} />
          <DetailFact label="Next Stripe retry" value={formatDate(item.nextPaymentAttemptAt)} />
          <DetailFact label="Next email" value={formatDate(item.nextEmailAt)} />
          <DetailFact label="Case status" value={getStatusLabel(item.caseStatus)} />
          <DetailFact label="Stripe invoice status" value={formatLabel(item.invoiceStatus)} />
          <DetailFact label="Last update" value={formatDate(item.updatedAt)} />
        </dl>
      </details>
    </article>
  );
}

function EmptyCases() {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center sm:py-16">
      <span className="flex size-11 items-center justify-center rounded-[10px] bg-[var(--surface-muted)] text-[var(--muted)]">
        <Icon className="size-5" name="inbox" />
      </span>
      <h2 className="mt-4 text-sm font-semibold text-[var(--foreground)]">
        No cases match these filters
      </h2>
      <p className="mt-1 max-w-sm text-xs leading-5 text-[var(--muted)]">
        Adjust the filters or wait for Stripe to report another failed payment.
      </p>
      <Link
        className="mt-4 inline-flex h-9 items-center justify-center rounded-[8px] border border-[var(--border)] px-3 text-xs font-semibold text-[var(--foreground)]"
        href="/dashboard/cases"
      >
        Clear filters
      </Link>
    </div>
  );
}

function CasesPagination({ page }: { page: RecoveryCasesPage }) {
  if (page.totalCount === 0) return null;

  const first = (page.filters.page - 1) * page.pageSize + 1;
  const last = first + page.cases.length - 1;
  const previousHref = getCasesHref(page.filters, {
    page: Math.max(1, page.filters.page - 1),
  });
  const nextHref = getCasesHref(page.filters, { page: page.filters.page + 1 });

  return (
    <nav
      aria-label="Cases pagination"
      className="flex flex-col gap-3 border-t border-[var(--border)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
    >
      <p className="text-center text-xs text-[var(--muted)] sm:text-left">
        Showing {first}–{last} of {page.totalCount}
      </p>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        {page.filters.page > 1 ? (
          <Link className="inline-flex h-9 items-center justify-center rounded-[8px] border border-[var(--border)] px-3 text-xs font-semibold text-[var(--foreground)] hover:border-[var(--border-strong)]" href={previousHref}>
            Previous
          </Link>
        ) : (
          <span aria-disabled="true" className="inline-flex h-9 items-center justify-center rounded-[8px] border border-[var(--border)] px-3 text-xs font-semibold text-[var(--muted)] opacity-50">
            Previous
          </span>
        )}
        <p className="whitespace-nowrap text-xs text-[var(--muted)]">
          Page {page.filters.page} of {Math.max(page.pageCount, 1)}
        </p>
        {page.filters.page < page.pageCount ? (
          <Link className="inline-flex h-9 items-center justify-center rounded-[8px] border border-[var(--border)] px-3 text-xs font-semibold text-[var(--foreground)] hover:border-[var(--border-strong)]" href={nextHref}>
            Next
          </Link>
        ) : (
          <span aria-disabled="true" className="inline-flex h-9 items-center justify-center rounded-[8px] border border-[var(--border)] px-3 text-xs font-semibold text-[var(--muted)] opacity-50">
            Next
          </span>
        )}
      </div>
    </nav>
  );
}

export function CasesContent({ page }: { page: RecoveryCasesPage }) {
  const highValueActive =
    page.filters.currency !== null && page.filters.minimumAmountCents !== null;
  const environment = getCasesEnvironmentLabel(page.filters.environment);
  const queueDescription = page.filters.status === "attention"
    ? "Cases with exhausted recovery, operational failures, or email-delivery issues."
    : "See the payment issue, recovery progress, and next step for each case.";

  return (
    <div className="dashboard-page-enter px-5 py-5 sm:px-8 sm:py-8 lg:px-8 xl:px-10">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-[22px] lg:gap-[26px]">
        <section>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[28px] font-normal tracking-[-0.035em] text-[var(--foreground)] lg:text-[30px]">
                Cases
              </h1>
              <p className="mt-2 text-[13px] leading-5 text-[var(--muted)] lg:text-sm">
                Review failed payments and decide what to do next.
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-[6px] bg-[var(--primary-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--primary)] lg:hidden">
              <span aria-hidden className="size-[5px] rounded-full bg-[var(--primary)]" />
              Stripe · {environment}
            </span>
          </div>
        </section>

        <section className={`${cardClass} overflow-hidden`}>
          <div className="flex flex-col gap-2 px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-5 lg:px-6">
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">Recovery queue</h2>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--muted)]">
                {queueDescription}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {page.totalCount} matching {page.totalCount === 1 ? "case" : "cases"}
              </p>
              {highValueActive ? (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {page.filters.currency?.toUpperCase()} {page.filters.minimumAmountInput}+ · highest value first
                </p>
              ) : null}
            </div>
          </div>

          <div className="border-t border-[var(--border)] px-4 py-4 sm:px-5 lg:px-6">
            <CasesFilters filters={page.filters} />
          </div>

          {page.cases.length === 0 ? (
            <EmptyCases />
          ) : (
            <>
              <DesktopCases cases={page.cases} highValueActive={highValueActive} />
              <div className="flex flex-col gap-3 border-t border-[var(--border)] bg-[var(--background)] p-3 lg:hidden">
                {page.cases.map((item) => (
                  <MobileCaseCard highValueActive={highValueActive} item={item} key={item.id} />
                ))}
              </div>
            </>
          )}

          <CasesPagination page={page} />
        </section>

        <p className="text-xs leading-5 text-[var(--muted)]">
          Amounts are compared only within the selected currency. Amount at risk is unpaid invoice value, not confirmed lost revenue.
        </p>
      </div>
    </div>
  );
}
