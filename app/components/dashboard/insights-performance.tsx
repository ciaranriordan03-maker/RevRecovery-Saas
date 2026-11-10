import Link from "next/link";
import type {
  DeliveryHealthMetric,
  EmailRecoveryMetric,
  InsightCardMetric,
  InsightFunnelMetric,
  InsightsFilter,
  InsightsMetrics,
  SegmentMetric,
} from "../../lib/server/insights-metrics";
import { Icon } from "../ui-icon";

const attentionLabels = [
  "Temporarily delayed",
  "Bounced",
  "Complaints",
  "Failed, suppressed, or canceled",
] as const;

function getDeliveryValue(metric: DeliveryHealthMetric, label: string) {
  return metric.rows.find((row) => row.label === label)?.value ?? 0;
}

function getInsightsHref(
  filter: InsightsFilter,
  view: "evidence" | "performance",
  overrides: Partial<InsightsFilter> = {},
) {
  const nextFilter = { ...filter, ...overrides };
  return `/dashboard/insights?environment=${nextFilter.environment}&period=${nextFilter.period}&segment=${nextFilter.segment}&view=${view}`;
}

function PerformanceAttention({ metric }: { metric: DeliveryHealthMetric }) {
  const attentionRows = metric.rows.filter(
    (row) => attentionLabels.includes(row.label as (typeof attentionLabels)[number]) && row.value > 0,
  );

  if (attentionRows.length === 0) return null;

  const issueCount = attentionRows.reduce((total, row) => total + row.value, 0);

  return (
    <section
      aria-labelledby="performance-attention-heading"
      className="rounded-[var(--radius-card)] border border-[var(--warning-text)] bg-[var(--warning-soft)] p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-5 shrink-0 text-[var(--warning-text)]" name="alert" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[var(--foreground)]" id="performance-attention-heading">
                Delivery needs attention
              </h2>
              <p className="mt-1 text-sm leading-6 text-[var(--muted-strong)]">
                {issueCount} {issueCount === 1 ? "message outcome needs" : "message outcomes need"} review.
              </p>
            </div>
            <a
              className="inline-flex w-fit shrink-0 items-center gap-1 text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
              href="#delivery-details"
            >
              Review details
              <Icon className="size-3.5" name="arrow-right" />
            </a>
          </div>
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Delivery outcomes requiring review">
            {attentionRows.map((row) => (
              <li
                className="rounded-[6px] bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--muted-strong)]"
                key={row.label}
              >
                {row.label}: {row.value}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function SnapshotMetric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div>
      <dt className="text-xs leading-5 text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tracking-[-0.02em] text-[var(--foreground)]">{value}</dd>
    </div>
  );
}

function PerformanceSnapshot({ insights }: { insights: InsightsMetrics }) {
  const acceptedCount = getDeliveryValue(insights.deliveryHealth, "Accepted by email provider");
  const deliveredCount = getDeliveryValue(insights.deliveryHealth, "Confirmed delivered");
  const deliveryRate = insights.deliveryHealth.deliveryRate;
  const engagementState = insights.emailEngagement.deliveredCount === 0
    ? "Awaiting delivered messages"
    : insights.emailEngagement.clickedCount === 0 && insights.emailEngagement.openedCount === 0
      ? "No confirmed engagement recorded yet"
      : null;

  return (
    <section
      aria-labelledby="performance-snapshot-heading"
      className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]"
    >
      <div className="border-b border-[var(--border)] px-5 py-4 sm:px-6">
        <h2 className="text-base font-semibold tracking-[-0.02em] text-[var(--foreground)]" id="performance-snapshot-heading">
          Performance snapshot
        </h2>
        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
          A compact record of delivery, engagement and payment outcomes in this view.
        </p>
      </div>

      <div className="divide-y divide-[var(--border)]">
        <article className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center">
          <div>
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Message delivery</h3>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              Provider acceptance and confirmed delivery are separate outcomes.
            </p>
          </div>
          <dl className="grid gap-4 sm:grid-cols-3">
            <SnapshotMetric label="Messages accepted" value={acceptedCount} />
            <SnapshotMetric label="Confirmed delivered" value={deliveredCount} />
            <SnapshotMetric
              label="Confirmed delivery rate"
              value={deliveryRate === null ? "Awaiting provider outcomes" : `${deliveryRate}%`}
            />
          </dl>
        </article>

        <article className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center">
          <div>
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Customer engagement</h3>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              Opens are directional. Clicks are a stronger signal, but neither proves recovery.
            </p>
          </div>
          {engagementState ? (
            <p className="rounded-[8px] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--muted-strong)]">
              {engagementState}
            </p>
          ) : (
            <dl className="grid gap-4 sm:grid-cols-2">
              <SnapshotMetric
                label="Unique clicks"
                value={`${insights.emailEngagement.clickedCount}${insights.emailEngagement.clickRate === null ? "" : ` · ${insights.emailEngagement.clickRate}%`}`}
              />
              <SnapshotMetric
                label="Unique opens"
                value={`${insights.emailEngagement.openedCount}${insights.emailEngagement.openRate === null ? "" : ` · ${insights.emailEngagement.openRate}%`}`}
              />
            </dl>
          )}
        </article>

        <article className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center">
          <div>
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Payment outcomes</h3>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Observed in the selected cohort.</p>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <SnapshotMetric label="Recovered cases" value={insights.overviewSummary.recoveredCaseCount} />
            <SnapshotMetric label="Value on recovered cases" value={insights.overviewSummary.recoveredValue} />
          </dl>
        </article>
      </div>

      <p className="border-t border-[var(--border)] bg-[var(--surface-muted)] px-5 py-3 text-xs leading-5 text-[var(--muted-strong)] sm:px-6">
        Payment outcomes are observed in this cohort. They are not attributed to a specific message or to RevRecovery.
      </p>
    </section>
  );
}

function AudienceMetrics({ row }: { row: SegmentMetric }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <dt className="text-xs text-[var(--muted)]">Cases</dt>
        <dd className="mt-1 text-sm font-semibold text-[var(--foreground)]">{row.totalCount}</dd>
      </div>
      <div>
        <dt className="text-xs text-[var(--muted)]">Recovered</dt>
        <dd className="mt-1 text-sm font-semibold text-[var(--foreground)]">
          {row.recoveredCount} of {row.totalCount}
          <span className="ml-1 font-normal text-[var(--muted)]">({row.recoveryRate}%)</span>
        </dd>
      </div>
      <div>
        <dt className="text-xs text-[var(--muted)]">Value on recovered cases</dt>
        <dd className="mt-1 text-sm font-semibold text-[var(--foreground)]">{row.amountDueOnRecoveredInvoices}</dd>
      </div>
      <div>
        <dt className="text-xs text-[var(--muted)]">Average recovery time</dt>
        <dd className="mt-1 text-sm font-semibold text-[var(--foreground)]">{row.averageRecoveryTime}</dd>
      </div>
    </dl>
  );
}

function AudienceComparison({ rows }: { rows: SegmentMetric[] }) {
  const populatedRows = rows.filter((row) => row.totalCount > 0);

  if (populatedRows.length === 0) return null;

  return (
    <section
      aria-labelledby="audience-comparison-heading"
      className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]"
    >
      <div className="border-b border-[var(--border)] px-5 py-4 sm:px-6">
        <h2 className="text-base font-semibold tracking-[-0.02em] text-[var(--foreground)]" id="audience-comparison-heading">
          Audience comparison
        </h2>
        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
          {populatedRows.length === 1
            ? "Only one audience has cases in this view."
            : "Compare observed recovery outcomes across audiences with recorded cases."}
        </p>
      </div>

      {populatedRows.length === 1 ? (
        <article className="px-5 py-5 sm:px-6">
          <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">{populatedRows[0].label}</h3>
          <AudienceMetrics row={populatedRows[0]} />
        </article>
      ) : (
        <>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[var(--surface-muted)] text-xs text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-3 font-medium sm:px-6" scope="col">Audience</th>
                  <th className="px-4 py-3 font-medium" scope="col">Cases</th>
                  <th className="px-4 py-3 font-medium" scope="col">Recovered</th>
                  <th className="px-4 py-3 font-medium" scope="col">Value on recovered cases</th>
                  <th className="px-5 py-3 font-medium sm:px-6" scope="col">Average recovery time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {populatedRows.map((row) => (
                  <tr key={row.label}>
                    <th className="px-5 py-4 font-medium text-[var(--foreground)] sm:px-6" scope="row">{row.label}</th>
                    <td className="px-4 py-4 text-[var(--muted-strong)]">{row.totalCount}</td>
                    <td className="px-4 py-4 text-[var(--muted-strong)]">
                      {row.recoveredCount} of {row.totalCount}
                      <span className="block text-xs text-[var(--muted)]">{row.recoveryRate}%</span>
                    </td>
                    <td className="px-4 py-4 text-[var(--muted-strong)]">{row.amountDueOnRecoveredInvoices}</td>
                    <td className="px-5 py-4 text-[var(--muted-strong)] sm:px-6">{row.averageRecoveryTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-[var(--border)] lg:hidden">
            {populatedRows.map((row) => (
              <li className="px-5 py-5 sm:px-6" key={row.label}>
                <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">{row.label}</h3>
                <AudienceMetrics row={row} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function MessageOutcomeList({ rows }: { rows: EmailRecoveryMetric[] }) {
  const hasCompletedSends = rows.some((row) => row.sentCount > 0);

  return (
    <section
      aria-labelledby="message-outcomes-heading"
      className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]"
    >
      <div className="border-b border-[var(--border)] px-5 py-4 sm:px-6">
        <h2 className="text-base font-semibold tracking-[-0.02em] text-[var(--foreground)]" id="message-outcomes-heading">
          Message outcomes
        </h2>
        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
          Recoveries observed after the latest prior message, without claiming the message caused them.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-[var(--muted)] sm:px-6">No recovery messages have been sent in this view.</p>
      ) : (
        <>
          {!hasCompletedSends ? (
            <p className="border-b border-[var(--border)] bg-[var(--surface-muted)] px-5 py-3 text-sm text-[var(--muted-strong)] sm:px-6">
              No completed sends are available for comparison yet.
            </p>
          ) : null}
          <div className="hidden md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[var(--surface-muted)] text-xs text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-3 font-medium sm:px-6" scope="col">Message</th>
                  <th className="px-4 py-3 font-medium" scope="col">Sent</th>
                  <th className="px-4 py-3 font-medium" scope="col">Recoveries observed afterward</th>
                  <th className="px-5 py-3 font-medium sm:px-6" scope="col">Observed share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {rows.map((row) => (
                  <tr key={row.stepNumber}>
                    <th className="px-5 py-4 font-medium text-[var(--foreground)] sm:px-6" scope="row">{row.label}</th>
                    <td className="px-4 py-4 text-[var(--muted-strong)]">{row.sentCount}</td>
                    <td className="px-4 py-4 text-[var(--muted-strong)]">{row.recoveredCount}</td>
                    <td className="px-5 py-4 text-[var(--muted-strong)] sm:px-6">{row.recoveryRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-[var(--border)] md:hidden">
            {rows.map((row) => (
              <li className="px-5 py-4 sm:px-6" key={row.stepNumber}>
                <p className="text-sm font-semibold text-[var(--foreground)]">{row.label}</p>
                <dl className="mt-3 grid grid-cols-3 gap-3">
                  <div><dt className="text-[11px] text-[var(--muted)]">Sent</dt><dd className="mt-1 text-sm text-[var(--foreground)]">{row.sentCount}</dd></div>
                  <div><dt className="text-[11px] text-[var(--muted)]">Observed</dt><dd className="mt-1 text-sm text-[var(--foreground)]">{row.recoveredCount}</dd></div>
                  <div><dt className="text-[11px] text-[var(--muted)]">Share</dt><dd className="mt-1 text-sm text-[var(--foreground)]">{row.recoveryRate}%</dd></div>
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="border-t border-[var(--border)] bg-[var(--surface-muted)] px-5 py-3 text-xs leading-5 text-[var(--muted-strong)] sm:px-6">
        These associations are descriptive. Timing alone does not prove that a message caused a payment recovery.
      </p>
    </section>
  );
}

function getOperationalStatus(insights: InsightsMetrics) {
  const issueCount = attentionLabels.reduce(
    (total, label) => total + getDeliveryValue(insights.deliveryHealth, label),
    0,
  );
  const awaitingValue = insights.funnel.find((row) => row.label === "Messages awaiting completion")?.value ?? "0";
  const awaitingCount = Number.parseInt(awaitingValue, 10);
  const acceptedCount = getDeliveryValue(insights.deliveryHealth, "Accepted by email provider");

  if (issueCount > 0) return `${issueCount} ${issueCount === 1 ? "issue" : "issues"}`;
  if (Number.isFinite(awaitingCount) && awaitingCount > 0) return `${awaitingCount} awaiting completion`;
  if (acceptedCount === 0 || insights.deliveryHealth.deliveryRate === null) return "Awaiting evidence";
  return "No operational issues";
}

function SupportingContext({ cards }: { cards: InsightCardMetric[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {cards.map((card) => (
        <section className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-muted)] p-4" key={card.title}>
          <div className="flex items-center gap-3">
            <span className={`flex size-9 items-center justify-center rounded-[8px] ${card.iconClass}`}>
              <Icon className="size-4" name={card.icon} />
            </span>
            <h3 className="text-sm font-semibold text-[var(--foreground)]">{card.title}</h3>
          </div>
          <dl className="mt-4 divide-y divide-[var(--border)]">
            {card.rows.map((row) => (
              <div className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4" key={row.label}>
                <dt className="text-xs text-[var(--muted)]">{row.label}</dt>
                <dd className="text-sm font-medium text-[var(--foreground)]">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

function OperationalDetail({
  cards,
  funnel,
  status,
}: {
  cards: InsightCardMetric[];
  funnel: InsightFunnelMetric[];
  status: string;
}) {
  return (
    <details
      className="group scroll-mt-6 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]"
      id="delivery-details"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] sm:px-6 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-base font-semibold tracking-[-0.02em] text-[var(--foreground)]">Operational detail</span>
          <span className="mt-1 block text-sm leading-6 text-[var(--muted)]">
            Inspect supporting message and case states only when you need them.
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="hidden rounded-[6px] bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-medium text-[var(--muted-strong)] sm:inline-flex">
            {status}
          </span>
          <Icon className="size-4 text-[var(--muted)] transition-transform group-open:rotate-90" name="arrow-right" />
        </span>
      </summary>

      <div className="border-t border-[var(--border)] px-5 py-5 sm:px-6 sm:py-6">
        <section aria-labelledby="message-case-states-heading">
          <h3 className="text-sm font-semibold text-[var(--foreground)]" id="message-case-states-heading">Message and case states</h3>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            Message states and payment outcomes use separate populations and should not be read as one funnel.
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {funnel.map((item) => (
              <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface-muted)] p-3" key={item.label}>
                <dt className="text-xs leading-5 text-[var(--muted)]">{item.label}</dt>
                <dd className="mt-1 text-sm font-semibold text-[var(--foreground)]">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="mt-5 border-t border-[var(--border)] pt-5">
          <SupportingContext cards={cards} />
        </div>
      </div>
    </details>
  );
}

function EmptyInsightsPerformance({ filter }: { filter: InsightsFilter }) {
  return (
    <section className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-5 py-12 text-center sm:px-8">
      <span className="mx-auto flex size-11 items-center justify-center rounded-[12px] bg-[var(--primary-soft)] text-[var(--primary)]">
        <Icon className="size-5" name="chart" />
      </span>
      <h2 className="mt-4 text-lg font-semibold tracking-[-0.02em] text-[var(--foreground)]">
        No performance data matches this view
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--muted)]">
        Try a wider period or another audience. Test and Live evidence remain separate.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {filter.period !== "all" ? (
          <Link
            className="inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] bg-[var(--primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
            href={getInsightsHref(filter, "performance", { period: "all" })}
          >
            View all time
          </Link>
        ) : null}
        <Link
          className="inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--foreground)] hover:border-[var(--border-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
          href="/dashboard/cases"
        >
          Open cases
        </Link>
      </div>
    </section>
  );
}

export function InsightsPerformance({
  filter,
  insights,
}: {
  filter: InsightsFilter;
  insights: InsightsMetrics;
}) {
  const acceptedCount = getDeliveryValue(insights.deliveryHealth, "Accepted by email provider");
  const hasPerformanceData = insights.overviewSummary.totalCaseCount > 0
    || acceptedCount > 0
    || insights.emailEngagement.deliveredCount > 0
    || insights.emailEngagement.openedCount > 0
    || insights.emailEngagement.clickedCount > 0;

  if (!hasPerformanceData) {
    return <EmptyInsightsPerformance filter={filter} />;
  }

  return (
    <div className="flex flex-col gap-5">
      <PerformanceAttention metric={insights.deliveryHealth} />
      <PerformanceSnapshot insights={insights} />
      <AudienceComparison rows={insights.segmentBreakdown} />
      <MessageOutcomeList rows={insights.emailRecovery} />
      <OperationalDetail
        cards={insights.cards}
        funnel={insights.funnel}
        status={getOperationalStatus(insights)}
      />
      <footer className="flex flex-col gap-2 border-t border-[var(--border)] pt-4 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
        <p>These figures are descriptive, not causal.</p>
        <Link
          className="font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
          href={getInsightsHref(filter, "evidence")}
        >
          How these numbers work
        </Link>
      </footer>
    </div>
  );
}
