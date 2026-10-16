import Link from "next/link";
import { Icon } from "../ui-icon";
import type {
  CohortComparisonMetric,
  DescriptiveBaselineMetric,
  EmailRecoveryMetric,
  DeliveryHealthMetric,
  DataSufficiencyMetric,
  EmailEngagementMetric,
  InsightCardMetric,
  InsightFunnelMetric,
  InsightsMetrics,
  InsightsFilter,
  MeasurementQualityMetric,
  MeasurementEvidenceMetric,
  SequenceSummaryMetric,
  SegmentMetric,
} from "../../lib/server/insights-metrics";

function MeasurementEvidencePanel({ metric }: { metric: MeasurementEvidenceMetric }) {
  return (
    <section
      aria-labelledby="measurement-evidence-heading"
      className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.04em] text-[var(--muted)]">Audit context</p>
          <h2 className="mt-1 text-base font-medium text-[var(--foreground)]" id="measurement-evidence-heading">
            {metric.title}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Exact scope, boundaries, gates, and definitions for this view.</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs font-medium uppercase tracking-[0.04em] text-[var(--muted)]">Evaluated at</p>
          <time className="mt-1 block font-mono text-xs text-[var(--muted-strong)]" dateTime={metric.evaluatedAt}>
            {metric.evaluatedAt}
          </time>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <div className="rounded-[10px] border border-[var(--border)] bg-[var(--background)] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.04em] text-[var(--muted)]">Selected scope</p>
          <dl className="mt-3 grid gap-3 text-sm">
            <div><dt className="text-[var(--muted)]">Environment</dt><dd className="mt-1 font-medium text-[var(--foreground)]">{metric.scope.environment}</dd></div>
            <div><dt className="text-[var(--muted)]">Audience</dt><dd className="mt-1 font-medium text-[var(--foreground)]">{metric.scope.audience}</dd></div>
          </dl>
        </div>
        <div className="rounded-[10px] border border-[var(--border)] bg-[var(--background)] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.04em] text-[var(--muted)]">Exact cohort boundaries</p>
          <dl className="mt-3 grid gap-3 text-sm">
            <div><dt className="text-[var(--muted)]">Current</dt><dd className="mt-1 break-words font-mono text-xs text-[var(--foreground)]">{metric.boundaries.current}</dd></div>
            <div><dt className="text-[var(--muted)]">Previous</dt><dd className="mt-1 break-words font-mono text-xs text-[var(--foreground)]">{metric.boundaries.previous}</dd></div>
          </dl>
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-medium text-[var(--foreground)]">Gate outcomes</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {metric.gateOutcomes.map((gate) => (
            <div className="flex items-start justify-between gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--background)] p-3" key={gate.label}>
              <div><p className="text-xs text-[var(--muted)]">{gate.label}</p><p className="mt-1 text-sm font-medium text-[var(--foreground)]">{gate.value}</p></div>
              <span className={`rounded-[8px] px-2 py-1 text-xs font-medium ${gate.passed ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-[var(--warning-soft)] text-[var(--warning-text)]"}`}>
                {gate.passed ? "Pass" : "Waiting"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-medium text-[var(--foreground)]">Calculation definitions</h3>
        <dl className="mt-3 grid gap-3">
          {metric.definitions.map((definition) => (
            <div className="rounded-[10px] border border-[var(--border)] bg-[var(--background)] p-3" key={definition.label}>
              <dt className="text-xs font-medium text-[var(--foreground)]">{definition.label}</dt>
              <dd className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">{definition.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="mt-4 text-xs leading-5 text-[var(--muted)]">{metric.summary}</p>
    </section>
  );
}

function CohortComparisonPanel({ metric }: { metric: CohortComparisonMetric }) {
  return (
    <section
      aria-labelledby="cohort-comparison-heading"
      className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.04em] text-[var(--muted)]">Period comparison</p>
          <h2 className="mt-1 text-base font-medium text-[var(--foreground)]" id="cohort-comparison-heading">
            {metric.title}
          </h2>
        </div>
        <span className={`w-fit rounded-[8px] px-3 py-1.5 text-xs font-medium ${metric.available ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-[var(--surface-muted)] text-[var(--muted-strong)]"}`}>
          {metric.available ? "Read only" : "Withheld"}
        </span>
      </div>

      {metric.available ? (
        <div className="mt-5 overflow-x-auto">
          <div className="min-w-[680px]">
            <div className="grid grid-cols-[1.2fr_1fr_1fr_1.2fr] gap-3 border-b border-[var(--border)] px-3 pb-2 text-xs font-medium uppercase tracking-[0.04em] text-[var(--muted)]">
              <span>Measure</span>
              <span>{metric.previousLabel}</span>
              <span>{metric.currentLabel}</span>
              <span>Observed change</span>
            </div>
            {metric.rows.map((row) => (
              <div className="grid grid-cols-[1.2fr_1fr_1fr_1.2fr] gap-3 border-b border-[var(--border)] px-3 py-4 text-sm last:border-b-0" key={row.label}>
                <div>
                  <p className="font-medium text-[var(--foreground)]">{row.label}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{row.detail}</p>
                </div>
                <p className="text-[var(--muted-strong)]">{row.previous}</p>
                <p className="font-medium text-[var(--foreground)]">{row.current}</p>
                <p className="text-[var(--muted-strong)]">{row.observedChange}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-[10px] border border-[var(--warning)] bg-[var(--warning-soft)] p-4">
          <p className="text-sm font-medium text-[var(--foreground)]">No period comparison values are displayed</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">
            Both adjacent cohorts must independently pass every Baseline readiness gate.
          </p>
        </div>
      )}

      <p className="mt-4 text-xs leading-5 text-[var(--muted)]">{metric.summary}</p>
    </section>
  );
}

function DescriptiveBaselinePanel({ metric }: { metric: DescriptiveBaselineMetric }) {
  return (
    <section
      aria-labelledby="descriptive-baseline-heading"
      className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.04em] text-[var(--muted)]">
            Descriptive baseline
          </p>
          <h2 className="mt-1 text-base font-medium text-[var(--foreground)]" id="descriptive-baseline-heading">
            {metric.title}
          </h2>
        </div>
        <span className={`w-fit rounded-[8px] px-3 py-1.5 text-xs font-medium ${metric.available ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-[var(--surface-muted)] text-[var(--muted-strong)]"}`}>
          {metric.available ? "Read only" : "Withheld"}
        </span>
      </div>

      {metric.available ? (
        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          {metric.rows.map((row) => (
            <div className="rounded-[10px] border border-[var(--border)] bg-[var(--background)] p-4" key={row.label}>
              <dt className="text-xs font-medium uppercase tracking-[0.04em] text-[var(--muted)]">{row.label}</dt>
              <dd className="mt-2 text-lg font-semibold text-[var(--foreground)]">{row.value}</dd>
              <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">{row.detail}</p>
            </div>
          ))}
        </dl>
      ) : (
        <div className="mt-5 rounded-[10px] border border-[var(--warning)] bg-[var(--warning-soft)] p-4">
          <p className="text-sm font-medium text-[var(--foreground)]">No baseline values are displayed</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">
            Complete every Baseline readiness gate above before treating this cohort as a descriptive benchmark.
          </p>
        </div>
      )}

      <p className="mt-4 text-xs leading-5 text-[var(--muted)]">{metric.summary}</p>
    </section>
  );
}

function DataSufficiencyPanel({ metric }: { metric: DataSufficiencyMetric }) {
  return (
    <section
      aria-labelledby="data-sufficiency-heading"
      className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.04em] text-[var(--muted)]">
            Baseline readiness
          </p>
          <h2 className="mt-1 text-base font-medium text-[var(--foreground)]" id="data-sufficiency-heading">
            {metric.title}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Check whether the selected evidence is sufficient for defensible descriptive reporting.
          </p>
        </div>
        <span className={`w-fit rounded-[8px] px-3 py-1.5 text-xs font-medium ${metric.eligible ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-[var(--warning-soft)] text-[var(--warning-text)]"}`}>
          {metric.eligible ? "All gates passed" : "Evidence incomplete"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {metric.gates.map((gate) => (
          <article
            className={`rounded-[10px] border p-4 ${gate.passed ? "border-[var(--success-badge)] bg-[var(--success-soft)]" : "border-[var(--warning)] bg-[var(--warning-soft)]"}`}
            key={gate.label}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.04em] text-[var(--muted)]">{gate.label}</p>
              <span className={`text-xs font-medium ${gate.passed ? "text-[var(--success)]" : "text-[var(--warning-text)]"}`}>
                {gate.passed ? "Pass" : "Waiting"}
              </span>
            </div>
            <p className="mt-2 text-sm font-medium text-[var(--foreground)]">{gate.value}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">{gate.detail}</p>
          </article>
        ))}
      </div>

      <p className="mt-4 text-xs leading-5 text-[var(--muted)]">{metric.summary}</p>
    </section>
  );
}

function MeasurementQualityPanel({ metric }: { metric: MeasurementQualityMetric }) {
  const statusClasses = {
    attention: "border-[var(--warning)] bg-[var(--warning-soft)]",
    clear: "border-[var(--success-badge)] bg-[var(--success-soft)]",
    informational: "border-[var(--blue-border)] bg-[var(--blue-soft)]",
  } as const;

  return (
    <section
      aria-labelledby="measurement-quality-heading"
      className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.04em] text-[var(--muted)]">
            Evidence context
          </p>
          <h2 className="mt-1 text-base font-medium text-[var(--foreground)]" id="measurement-quality-heading">
            {metric.title}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Understand what the selected Insights figures can—and cannot—support.
          </p>
        </div>
        <span className="w-fit rounded-[8px] bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-medium text-[var(--muted-strong)]">
          Read only
        </span>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {metric.items.map((item) => (
          <article className={`rounded-[10px] border p-4 ${statusClasses[item.status]}`} key={item.label}>
            <p className="text-xs font-medium uppercase tracking-[0.04em] text-[var(--muted)]">{item.label}</p>
            <p className="mt-2 text-sm font-medium text-[var(--foreground)]">{item.value}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">{item.detail}</p>
          </article>
        ))}
      </div>

      <p className="mt-4 text-xs leading-5 text-[var(--muted)]">{metric.summary}</p>
    </section>
  );
}

function InsightFilters({ filter }: { filter: InsightsFilter }) {
  const periods = [["30d", "30 days"], ["90d", "90 days"], ["all", "All time"]] as const;
  const segments = [["all", "All audiences"], ["subscription", "Subscriptions"], ["standalone", "Standalone"], ["unknown", "Unknown"]] as const;
  const environments = [["live", "Live"], ["test", "Test"], ["unconfirmed", "Unconfirmed"]] as const;
  return (
    <section className="grid gap-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.04em] text-[var(--muted)]">Evidence environment</p>
        <div className="flex flex-wrap gap-2" aria-label="Evidence environment">
          {environments.map(([value, label]) => <Link className={`rounded-[8px] px-3 py-2 text-sm ${filter.environment === value ? "bg-[var(--primary)] text-white" : "bg-[var(--background)] text-[var(--muted-strong)]"}`} href={`?environment=${value}&period=${filter.period}&segment=${filter.segment}`} key={value}>{label}</Link>)}
        </div>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.04em] text-[var(--muted)]">Failure period</p>
          <div className="flex flex-wrap gap-2" aria-label="Date range">
            {periods.map(([value, label]) => <Link className={`rounded-[8px] px-3 py-2 text-sm ${filter.period === value ? "bg-[var(--primary)] text-white" : "bg-[var(--background)] text-[var(--muted-strong)]"}`} href={`?environment=${filter.environment}&period=${value}&segment=${filter.segment}`} key={value}>{label}</Link>)}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.04em] text-[var(--muted)]">Invoice audience</p>
          <div className="flex flex-wrap gap-2" aria-label="Audience cohort">
            {segments.map(([value, label]) => <Link className={`rounded-[8px] px-3 py-2 text-sm ${filter.segment === value ? "bg-[var(--primary)] text-white" : "bg-[var(--background)] text-[var(--muted-strong)]"}`} href={`?environment=${filter.environment}&period=${filter.period}&segment=${value}`} key={value}>{label}</Link>)}
          </div>
        </div>
      </div>
    </section>
  );
}

function SegmentBreakdown({ rows }: { rows: SegmentMetric[] }) {
  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
      <h2 className="text-sm font-medium text-[var(--foreground)]">Recovery by audience</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">Compare recurring subscription renewals with other invoice types.</p>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {rows.map((row) => (
          <article className="rounded-[10px] border border-[var(--border)] bg-[var(--background)] p-4" key={row.label}>
            <h3 className="text-sm font-medium text-[var(--foreground)]">{row.label}</h3>
            <p className="mt-3 text-xs text-[var(--muted)]">Amount due on invoices later recovered</p>
            <p className="mt-1 text-2xl font-semibold text-[var(--success)]">{row.amountDueOnRecoveredInvoices}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div><dt className="text-[var(--muted)]">Cases</dt><dd className="mt-1 font-medium">{row.totalCount}</dd></div>
              <div><dt className="text-[var(--muted)]">Recovery rate</dt><dd className="mt-1 font-medium">{row.recoveryRate}%</dd></div>
              <div><dt className="text-[var(--muted)]">Average recovery</dt><dd className="mt-1 font-medium">{row.averageRecoveryTime}</dd></div>
              <div><dt className="text-[var(--muted)]">Emails sent</dt><dd className="mt-1 font-medium">{row.sentCount}</dd></div>
              <div><dt className="text-[var(--muted)]">Delivery rate</dt><dd className="mt-1 font-medium">{row.deliveryRate === null ? "Awaiting data" : `${row.deliveryRate}%`}</dd></div>
              <div><dt className="text-[var(--muted)]">Open / click</dt><dd className="mt-1 font-medium">{row.openRate ?? 0}% / {row.clickRate ?? 0}%</dd></div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function EmailEngagementCard({ metric }: { metric: EmailEngagementMetric }) {
  const formatRate = (rate: number | null) => rate === null ? "Awaiting data" : `${rate}%`;

  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
      <div>
        <h2 className="text-sm font-medium text-[var(--foreground)]">
          Email Engagement
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Unique-message engagement among emails confirmed delivered by Resend.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-4 py-3">
          <p className="text-xs text-[var(--muted)]">Confirmed delivered</p>
          <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
            {metric.deliveredCount}
          </p>
        </div>
        <div className="rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-4 py-3">
          <p className="text-xs text-[var(--muted)]">Unique opens</p>
          <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
            {metric.openedCount} · {formatRate(metric.openRate)}
          </p>
        </div>
        <div className="rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-4 py-3">
          <p className="text-xs text-[var(--muted)]">Unique clicks</p>
          <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
            {metric.clickedCount} · {formatRate(metric.clickRate)}
          </p>
        </div>
      </div>

      <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
        Opens are directional because privacy protections and automated image loading can affect them. Clicks are a stronger engagement signal, but neither proves that RevRecovery caused a payment recovery.
      </p>
    </section>
  );
}

type InsightCardProps = {
  icon: string;
  iconClass: string;
  rows: {
    label: string;
    rowClass: string;
    value: string;
    valueClass: string;
  }[];
  title: string;
};

function RecoveryFunnelCard({ funnel }: { funnel: InsightFunnelMetric[] }) {
  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
      <h2 className="text-sm font-medium text-[var(--foreground)]">
        Delivery and Recovery Status
      </h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Message delivery and payment recovery are separate operational measures.
      </p>
      <div className="mt-6 flex flex-col gap-5">
        {funnel.map((item) => (
          <div key={item.label}>
            <div className="mb-2 flex items-center justify-between gap-4">
              <p className="text-sm text-[var(--muted-strong)]">{item.label}</p>
              <p className="text-xs font-medium text-[var(--muted)]">
                {item.value}
              </p>
            </div>
            <div className={`h-7 overflow-hidden rounded-[8px] ${item.trackClass}`}>
              <div className={`h-full rounded-[8px] ${item.barClass}`} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function InsightCard({
  icon,
  iconClass,
  rows,
  title,
}: InsightCardProps | InsightCardMetric) {
  return (
    <article className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-4">
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-[10px] ${iconClass}`}
        >
          <Icon name={icon} className="size-5" />
        </div>
        <h2 className="text-sm font-medium text-[var(--foreground)]">{title}</h2>
      </div>
      <div className="mt-5 flex flex-col gap-3">
        {rows.map((row) => (
          <div
            className={`flex flex-col gap-2 rounded-[10px] border px-3 py-3 sm:flex-row sm:items-center sm:justify-between ${row.rowClass}`}
            key={row.label}
          >
            <p className="text-sm text-[var(--text-subtle)]">{row.label}</p>
            <p className={`text-sm font-medium ${row.valueClass}`}>{row.value}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function SequenceSummaryCard({ metrics }: { metrics: SequenceSummaryMetric[] }) {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {metrics.map((metric) => (
        <article
          className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]"
          key={metric.label}
        >
          <p className="text-sm font-medium text-[var(--muted-strong)]">{metric.label}</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">
            {metric.value}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">{metric.caption}</p>
        </article>
      ))}
    </section>
  );
}

function DeliveryHealthCard({ metric }: { metric: DeliveryHealthMetric }) {
  const rateLabel = metric.deliveryRate === null ? "Awaiting outcomes" : `${metric.deliveryRate}%`;
  const rateCaption = metric.deliveryRate === null
    ? "Delivery rate will appear after Resend reports a terminal outcome."
    : `Based on ${metric.terminalOutcomeCount} terminal provider ${metric.terminalOutcomeCount === 1 ? "outcome" : "outcomes"}.`;

  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-medium text-[var(--foreground)]">
            Provider Delivery Health
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Resend delivery outcomes are separate from whether Stripe later recovers the payment.
          </p>
        </div>
        <div className="rounded-[10px] bg-[var(--primary-soft)] px-4 py-3 sm:text-right">
          <p className="text-xs font-medium uppercase tracking-[0.04em] text-[var(--muted)]">
            Confirmed delivery rate
          </p>
          <p className="mt-1 text-xl font-semibold text-[var(--primary)]">{rateLabel}</p>
          <p className="mt-1 max-w-64 text-xs text-[var(--muted)]">{rateCaption}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metric.rows.map((row) => (
          <div
            className="rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-4 py-3"
            key={row.label}
          >
            <p className="text-xs text-[var(--muted)]">{row.label}</p>
            <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">{row.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function EmailRecoveryTable({ rows }: { rows: EmailRecoveryMetric[] }) {
  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-medium text-[var(--foreground)]">
            Recoveries after latest prior email
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            For directional reporting, each recovery is associated with the latest email sent before Stripe recorded the payment as recovered. This timing does not prove that the email caused the recovery.
          </p>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-[10px] border border-[var(--border)]">
        <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_1fr] bg-[var(--surface-muted)] px-4 py-3 text-xs font-medium uppercase tracking-[0.04em] text-[var(--muted)]">
          <span>Email</span>
          <span>Sent</span>
          <span>Associated</span>
          <span>Associated rate</span>
        </div>

        {rows.length === 0 ? (
          <div className="px-4 py-6 text-sm text-[var(--muted)]">
            No recovery emails have been scheduled yet.
          </div>
        ) : (
          rows.map((row) => (
            <div
              className="grid grid-cols-[1.2fr_0.8fr_0.8fr_1fr] items-center border-t border-[var(--border)] px-4 py-4 text-sm"
              key={row.stepNumber}
            >
              <span className="font-medium text-[var(--foreground)]">{row.label}</span>
              <span className="text-[var(--muted-strong)]">{row.sentCount}</span>
              <span className="text-[var(--muted-strong)]">{row.recoveredCount}</span>
              <span>
                <span className="inline-flex rounded-full bg-[var(--success-soft)] px-2.5 py-1 text-xs font-medium text-[var(--success)]">
                  {row.recoveryRate}%
                </span>
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export function InsightsContent({ filter, insights }: { filter: InsightsFilter; insights: InsightsMetrics }) {
  return (
    <div className="px-5 py-8 sm:px-8">
      <div className="mx-auto flex max-w-[1024px] flex-col gap-7">
        <InsightFilters filter={filter} />
        <MeasurementQualityPanel metric={insights.measurementQuality} />
        <DataSufficiencyPanel metric={insights.dataSufficiency} />
        <DescriptiveBaselinePanel metric={insights.baselineSummary} />
        <CohortComparisonPanel metric={insights.cohortComparison} />
        <MeasurementEvidencePanel metric={insights.measurementEvidence} />
        <SequenceSummaryCard metrics={insights.sequenceSummary} />

        <SegmentBreakdown rows={insights.segmentBreakdown} />

        <DeliveryHealthCard metric={insights.deliveryHealth} />

        <EmailEngagementCard metric={insights.emailEngagement} />

        <EmailRecoveryTable rows={insights.emailRecovery} />

        <RecoveryFunnelCard funnel={insights.funnel} />

        <div className="grid gap-5 xl:grid-cols-2">
          {insights.cards.map((card) => (
            <InsightCard
              icon={card.icon}
              iconClass={card.iconClass}
              key={card.title}
              rows={card.rows}
              title={card.title}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
