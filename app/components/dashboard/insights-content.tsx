import Link from "next/link";
import type { InsightsView } from "../../lib/insights-view";
import { Icon } from "../ui-icon";
import { InsightsMethodologyDialog } from "./insights-methodology-dialog";
import { InsightsPerformance } from "./insights-performance";
import type {
  InsightsMetrics,
  InsightsFilter,
} from "../../lib/server/insights-metrics";

const environmentLabels: Record<InsightsFilter["environment"], string> = {
  live: "Live data",
  test: "Test data",
  unconfirmed: "Environment unconfirmed",
};

const insightsViews: ReadonlyArray<{
  hrefLabel: string;
  label: string;
  value: InsightsView;
}> = [
  { hrefLabel: "Overview", label: "Overview", value: "overview" },
  { hrefLabel: "Performance", label: "Performance", value: "performance" },
];

function getInsightsHref(
  filter: InsightsFilter,
  view: InsightsView,
  overrides: Partial<InsightsFilter> = {},
) {
  const nextFilter = { ...filter, ...overrides };
  return `/dashboard/insights?environment=${nextFilter.environment}&period=${nextFilter.period}&segment=${nextFilter.segment}&view=${view}`;
}

function InsightsWorkspaceHeader({
  filter,
}: {
  filter: InsightsFilter;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[var(--foreground)]">
            Insights
          </h1>
          <span className="inline-flex rounded-[6px] bg-[var(--primary-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--primary)]">
            {environmentLabels[filter.environment]}
          </span>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
          See what is at risk, what has recovered, and where your recovery flow needs attention.
        </p>
      </div>
      <InsightsMethodologyDialog />
    </header>
  );
}

function InsightsWorkspaceNavigation({
  active,
  filter,
}: {
  active: InsightsView;
  filter: InsightsFilter;
}) {
  return (
    <nav aria-label="Insights views" className="overflow-x-auto border-b border-[var(--border)]">
      <div className="flex min-w-max gap-6">
        {insightsViews.map((item) => (
          <Link
            aria-current={active === item.value ? "page" : undefined}
            className={`border-b-2 px-0.5 pb-3 text-sm font-medium transition-colors ${
              active === item.value
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
            href={getInsightsHref(filter, item.value)}
            key={item.value}
          >
            <span className="sm:hidden">{item.hrefLabel}</span>
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

function InsightFilters({ filter, view }: { filter: InsightsFilter; view: InsightsView }) {
  const periods = [["30d", "30 days"], ["90d", "90 days"], ["all", "All time"]] as const;
  const segments = [["all", "All audiences"], ["subscription", "Subscriptions"], ["standalone", "Standalone"], ["unknown", "Unknown"]] as const;
  const environments = [["live", "Live"], ["test", "Test"], ["unconfirmed", "Unconfirmed"]] as const;
  return (
    <form
      action="/dashboard/insights"
      className="flex flex-col gap-3 rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)] p-3 sm:flex-row sm:items-end sm:p-4"
      method="get"
    >
      <input name="view" type="hidden" value={view} />
      <div className="grid flex-1 gap-3 sm:grid-cols-3">
        <label className="grid gap-1.5 text-xs font-medium text-[var(--muted-strong)]">
          Environment
          <select
            className="h-10 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)]"
            defaultValue={filter.environment}
            name="environment"
          >
            {environments.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-[var(--muted-strong)]">
          Period
          <select
            className="h-10 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)]"
            defaultValue={filter.period}
            name="period"
          >
            {periods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-[var(--muted-strong)]">
          Audience
          <select
            className="h-10 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)]"
            defaultValue={filter.segment}
            name="segment"
          >
            {segments.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>
      <button
        className="inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
        type="submit"
      >
        Apply
      </button>
    </form>
  );
}

function OverviewMetric({
  caption,
  label,
  tone = "default",
  value,
}: {
  caption: string;
  label: string;
  tone?: "default" | "positive";
  value: string;
}) {
  return (
    <article className="rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      <p className="text-xs leading-5 text-[var(--muted)]">{label}</p>
      <p className={`mt-1.5 break-words text-[28px] font-semibold leading-9 tracking-[-0.03em] ${tone === "positive" ? "text-[var(--success)]" : "text-[var(--foreground)]"}`}>
        {value}
      </p>
      <p className="mt-1 text-[11px] leading-4 text-[var(--muted)]">{caption}</p>
    </article>
  );
}

function OutcomeSummary({
  insights,
}: {
  insights: InsightsMetrics;
}) {
  const { overviewSummary } = insights;
  const outcomes = [
    {
      colorClass: "bg-[var(--primary)]",
      count: overviewSummary.openCaseCount,
      label: "Open",
    },
    {
      colorClass: "bg-[var(--success)]",
      count: overviewSummary.recoveredCaseCount,
      label: "Recovered",
    },
    {
      colorClass: "bg-[var(--border-strong)]",
      count: overviewSummary.otherClosedCaseCount,
      label: "Other closed",
    },
  ];

  return (
    <section className="rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-[-0.02em] text-[var(--foreground)]">Case outcomes</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">Where the selected failed-payment cases stand now.</p>
        </div>
        <span className="w-fit rounded-[6px] bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--muted-strong)]">
          {overviewSummary.totalCaseCount} {overviewSummary.totalCaseCount === 1 ? "case" : "cases"}
        </span>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-3">
        {outcomes.map((outcome) => (
          <div className="rounded-[10px] bg-[var(--surface-muted)] px-3.5 py-3" key={outcome.label}>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-sm text-[var(--muted-strong)]">
                <span aria-hidden className={`size-2 rounded-full ${outcome.colorClass}`} />
                {outcome.label}
              </dt>
              <dd className="text-sm font-semibold text-[var(--foreground)]">{outcome.count}</dd>
            </div>
            <progress
              aria-label={`${outcome.label}: ${outcome.count} of ${overviewSummary.totalCaseCount} cases`}
              className={`mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--border)] ${outcome.label === "Recovered" ? "accent-[var(--success)]" : outcome.label === "Open" ? "accent-[var(--primary)]" : "accent-[var(--muted)]"}`}
              max={overviewSummary.totalCaseCount}
              value={outcome.count}
            />
          </div>
        ))}
      </dl>
    </section>
  );
}

function OverviewContext({
  filter,
  insights,
}: {
  filter: InsightsFilter;
  insights: InsightsMetrics;
}) {
  const trendRow = insights.cohortComparison.rows.find((row) => row.label === "Terminal recovery share");

  if (!insights.cohortComparison.available || !trendRow) {
    return (
      <p className="rounded-[10px] bg-[var(--surface-muted)] px-4 py-3 text-sm leading-6 text-[var(--muted-strong)]">
        {filter.period === "all"
          ? "Choose a 30- or 90-day period when you want to compare it with the previous period."
          : "A period trend will appear after both periods have enough completed cases."}
      </p>
    );
  }

  return (
    <section className="rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">Trend</p>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">{trendRow.current}</p>
          <span className="text-xs font-semibold text-[var(--muted-strong)]">{trendRow.observedChange}</span>
        </div>
        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Compared with {trendRow.previous} in the previous period. Observed change only.</p>
    </section>
  );
}

function ReportingConfidenceNote({ insights }: { insights: InsightsMetrics }) {
  if (insights.dataSufficiency.eligible) return null;

  const sampleGate = insights.dataSufficiency.gates.find((gate) => gate.label === "Sample size");
  const outcomeGate = insights.dataSufficiency.gates.find((gate) => gate.label === "Outcome maturity");
  const totalCaseCount = insights.overviewSummary.totalCaseCount;
  const completedOutcomeCount = insights.overviewSummary.recoveredCaseCount
    + insights.overviewSummary.otherClosedCaseCount;
  const notes: string[] = [];

  if (sampleGate && !sampleGate.passed) {
    notes.push(`Early data — based on ${totalCaseCount} ${totalCaseCount === 1 ? "case" : "cases"}.`);
  }

  if (outcomeGate && !outcomeGate.passed) {
    notes.push(
      completedOutcomeCount === 0
        ? "Recovery rate will appear after more cases reach a final outcome."
        : `Outcomes are still developing — ${completedOutcomeCount} of ${totalCaseCount} cases have reached a final outcome.`,
    );
  }

  if (notes.length === 0) return null;

  return (
    <aside aria-label="Reporting confidence" className="rounded-[10px] bg-[var(--surface-muted)] px-4 py-3">
      {notes.map((note) => (
        <p className="text-sm leading-6 text-[var(--muted-strong)]" key={note}>{note}</p>
      ))}
    </aside>
  );
}

function OverviewAttention({
  filter,
  insights,
}: {
  filter: InsightsFilter;
  insights: InsightsMetrics;
}) {
  type AttentionItem = {
    detail: string;
    href: string | null;
    label: string | null;
  };

  const monetaryGate = insights.dataSufficiency.gates.find((gate) => gate.label === "Monetary evidence");
  const environmentGate = insights.dataSufficiency.gates.find((gate) => gate.label === "Environment certainty");
  const candidates: Array<AttentionItem | null> = [
    insights.overviewSummary.failedDeliveryCount > 0 ? {
      detail: `${insights.overviewSummary.failedDeliveryCount} ${insights.overviewSummary.failedDeliveryCount === 1 ? "message has" : "messages have"} a recorded delivery failure.`,
      href: getInsightsHref(filter, "performance"),
      label: "Review email delivery",
    } : null,
    environmentGate && !environmentGate.passed ? {
      detail: "Some selected cases do not have a confirmed Test or Live environment.",
      href: null,
      label: null,
    } : null,
    monetaryGate && !monetaryGate.passed && insights.overviewSummary.totalCaseCount > 0 ? {
      detail: "Some selected cases have incomplete amount or currency information.",
      href: null,
      label: null,
    } : null,
  ];
  const items = candidates.filter((item): item is AttentionItem => item !== null);

  if (items.length === 0) return null;

  return (
    <section aria-labelledby="insights-attention-heading" className="rounded-[var(--radius-dashboard-card)] border border-[var(--warning)] bg-[var(--warning-soft)] p-5">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-5 shrink-0 text-[var(--warning-text)]" name="alert" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-[var(--foreground)]" id="insights-attention-heading">Needs attention</h2>
          <div className="mt-2 grid gap-2">
            {items.map((item) => (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between" key={item.detail}>
                <p className="text-sm text-[var(--muted-strong)]">{item.detail}</p>
                {item.href && item.label ? (
                  <Link className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]" href={item.href}>
                    {item.label}
                    <Icon className="size-3.5" name="arrow-right" />
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function EmptyInsightsOverview({ filter }: { filter: InsightsFilter }) {
  return (
    <section className="rounded-[var(--radius-dashboard-card)] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-5 py-12 text-center sm:px-8">
      <span className="mx-auto flex size-11 items-center justify-center rounded-[12px] bg-[var(--primary-soft)] text-[var(--primary)]">
        <Icon className="size-5" name="chart" />
      </span>
      <h2 className="mt-4 text-lg font-semibold tracking-[-0.02em] text-[var(--foreground)]">No cases match this view</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--muted)]">
        Try a wider period or another audience. Test and Live evidence always remain separate.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {filter.period !== "all" ? (
          <Link className="inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] bg-[var(--primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]" href={getInsightsHref(filter, "overview", { period: "all" })}>
            View all time
          </Link>
        ) : null}
        <Link className="inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--foreground)] hover:border-[var(--border-strong)]" href="/dashboard/cases">
          Open cases
        </Link>
      </div>
    </section>
  );
}

function InsightsOverview({
  filter,
  insights,
}: {
  filter: InsightsFilter;
  insights: InsightsMetrics;
}) {
  const recoveryRate = insights.sequenceSummary[0];
  const recoveryTime = insights.sequenceSummary[1];

  if (insights.overviewSummary.totalCaseCount === 0) {
    return <EmptyInsightsOverview filter={filter} />;
  }

  return (
    <>
      <section aria-label="Recovery performance summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewMetric
          caption={`${insights.overviewSummary.openCaseCount} open ${insights.overviewSummary.openCaseCount === 1 ? "case" : "cases"} · currencies kept separate`}
          label="Revenue at risk"
          value={insights.overviewSummary.revenueAtRisk}
        />
        <OverviewMetric
          caption={`${insights.overviewSummary.recoveredCaseCount} recovered ${insights.overviewSummary.recoveredCaseCount === 1 ? "case" : "cases"} · amount due at failure`}
          label="Value on recovered cases"
          tone="positive"
          value={insights.overviewSummary.recoveredValue}
        />
        <OverviewMetric
          caption={recoveryRate?.caption ?? "No eligible sequences yet"}
          label={recoveryRate?.label ?? "Sequence recovery rate"}
          value={recoveryRate?.value ?? "—"}
        />
        <OverviewMetric
          caption={recoveryTime?.caption ?? "Waiting for the first recovery"}
          label={recoveryTime?.label ?? "Average recovery time"}
          value={recoveryTime?.value ?? "—"}
        />
      </section>

      <ReportingConfidenceNote insights={insights} />
      <OutcomeSummary insights={insights} />
      <OverviewAttention filter={filter} insights={insights} />
      <OverviewContext filter={filter} insights={insights} />
    </>
  );
}

export function InsightsContent({
  filter,
  insights,
  view = "overview",
}: {
  filter: InsightsFilter;
  insights: InsightsMetrics;
  view?: InsightsView;
}) {
  return (
    <div className="px-5 py-7 sm:px-8 lg:px-8 lg:py-8 xl:px-10">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-7">
        <InsightsWorkspaceHeader filter={filter} />
        <InsightsWorkspaceNavigation active={view} filter={filter} />
        {view === "performance" ? (
          <header>
            <h2 className="text-xl font-semibold tracking-[-0.025em] text-[var(--foreground)]">
              Performance
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              See whether recovery messages are reaching customers and what happened afterward.
            </p>
          </header>
        ) : null}
        <InsightFilters filter={filter} view={view} />

        {view === "overview" ? (
          <InsightsOverview filter={filter} insights={insights} />
        ) : null}

        {view === "performance" ? <InsightsPerformance filter={filter} insights={insights} /> : null}

      </div>
    </div>
  );
}
