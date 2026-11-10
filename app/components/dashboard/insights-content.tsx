import Link from "next/link";
import type { InsightsView } from "../../lib/insights-view";
import { Icon } from "../ui-icon";
import { MeasurementManifestVerification } from "./measurement-manifest-verification";
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

const environmentLabels: Record<InsightsFilter["environment"], string> = {
  live: "Live evidence",
  test: "Test evidence",
  unconfirmed: "Environment unconfirmed",
};

const insightsViews: ReadonlyArray<{
  hrefLabel: string;
  label: string;
  value: InsightsView;
}> = [
  { hrefLabel: "Overview", label: "Overview", value: "overview" },
  { hrefLabel: "Performance", label: "Performance", value: "performance" },
  { hrefLabel: "Evidence", label: "Evidence & methodology", value: "evidence" },
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
      <Link
        className="inline-flex h-9 w-fit items-center justify-center rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3.5 text-sm font-medium text-[var(--text-subtle)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)]"
        href={getInsightsHref(filter, "evidence")}
      >
        How these numbers work
      </Link>
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

function MeasurementEvidencePanel({ metric }: { metric: MeasurementEvidenceMetric }) {
  const manifestJson = `${JSON.stringify(metric.exportManifest, null, 2)}\n`;
  const manifestFilename = `revrecovery-insights-evidence-${metric.evaluatedAt.replace(/[:.]/g, "-")}.json`;
  const manifestHref = `data:application/json;charset=utf-8,${encodeURIComponent(manifestJson)}`;

  return (
    <section
      aria-labelledby="measurement-evidence-detail-heading"
      className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.04em] text-[var(--muted)]">Audit context</p>
          <h2 className="mt-1 text-base font-medium text-[var(--foreground)]" id="measurement-evidence-detail-heading">
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

      <div className="mt-5 rounded-[10px] border border-[var(--border)] bg-[var(--background)] p-4">
        <p className="text-xs font-medium uppercase tracking-[0.04em] text-[var(--muted)]">Measurement traceability</p>
        <dl className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-[var(--muted)]">Contract version</dt>
            <dd className="mt-1 font-mono text-xs font-medium text-[var(--foreground)]">{metric.traceability.contractVersion}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Fingerprint algorithm</dt>
            <dd className="mt-1 font-mono text-xs font-medium text-[var(--foreground)]">{metric.traceability.fingerprintAlgorithm}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-[var(--muted)]">Evidence fingerprint</dt>
            <dd className="mt-1 break-all font-mono text-xs leading-5 text-[var(--foreground)]">
              {metric.traceability.evidenceFingerprint}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs leading-5 text-[var(--muted-strong)]">
          {metric.traceability.fingerprintBasis} The fingerprint is generated server-side; no row identifiers or source values are displayed.
        </p>
      </div>

      <div className="mt-5 rounded-[10px] border border-[var(--primary-border)] bg-[var(--primary-soft)] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.04em] text-[var(--primary-text)]">
              Evidence export manifest
            </p>
            <h3 className="mt-1 text-sm font-medium text-[var(--foreground)]">Sanitized measurement record</h3>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--muted-strong)]">
              Export the contract, fingerprint, evaluation timestamp, selected scope, cohort boundaries, gate outcomes, and calculation definitions for this view.
            </p>
          </div>
          <a
            className="inline-flex w-fit items-center justify-center rounded-[8px] border border-[var(--primary)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--primary)] transition-colors hover:bg-[var(--primary)] hover:text-white"
            download={manifestFilename}
            href={manifestHref}
          >
            Download JSON
          </a>
        </div>

        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[8px] bg-[var(--surface)] p-3">
            <dt className="text-xs text-[var(--muted)]">Manifest version</dt>
            <dd className="mt-1 break-all font-mono text-xs font-medium text-[var(--foreground)]">
              {metric.exportManifest.manifestVersion}
            </dd>
          </div>
          <div className="rounded-[8px] bg-[var(--surface)] p-3">
            <dt className="text-xs text-[var(--muted)]">Included sections</dt>
            <dd className="mt-1 text-xs leading-5 text-[var(--foreground)]">
              Traceability, scope, boundaries, gates, definitions, and limitations
            </dd>
          </div>
        </dl>

        <details className="mt-3 rounded-[8px] bg-[var(--surface)] p-3">
          <summary className="cursor-pointer text-xs font-medium text-[var(--primary)]">Preview sanitized JSON</summary>
          <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-5 text-[var(--muted-strong)]">
            {manifestJson}
          </pre>
        </details>

        <p className="mt-3 text-xs leading-5 text-[var(--muted-strong)]">
          Read only. The manifest contains no case, customer, message, sequence, provider-event, or source-identifier rows and makes no new performance claim.
        </p>
      </div>

      <MeasurementManifestVerification
        currentManifest={metric.exportManifest}
        key={`${metric.exportManifest.evaluatedAt}:${metric.exportManifest.fingerprint.value}`}
      />

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
            Review the Baseline readiness checks in Evidence &amp; methodology before treating this cohort as a descriptive benchmark.
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
  const passedGateCount = insights.dataSufficiency.gates.filter((gate) => gate.passed).length;
  const totalGateCount = insights.dataSufficiency.gates.length;
  const trendRow = insights.cohortComparison.rows.find((row) => row.label === "Terminal recovery share");

  return (
    <section className="grid gap-4 md:grid-cols-2">
      <article className="rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">Trend</p>
        {insights.cohortComparison.available && trendRow ? (
          <>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">{trendRow.current}</p>
              <span className="text-xs font-semibold text-[var(--muted-strong)]">{trendRow.observedChange}</span>
            </div>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Compared with {trendRow.previous} in the previous period. Observed change only.</p>
          </>
        ) : (
          <>
            <h2 className="mt-2 text-base font-semibold text-[var(--foreground)]">Trend not measurable yet</h2>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Both periods need enough mature cases before a fair comparison appears.</p>
          </>
        )}
      </article>

      <article className="rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">Data confidence</p>
            <h2 className="mt-2 text-base font-semibold text-[var(--foreground)]">
              {insights.dataSufficiency.eligible ? "Ready for descriptive reporting" : "Evidence is still developing"}
            </h2>
          </div>
          <span className={`shrink-0 rounded-[6px] px-2.5 py-1 text-xs font-semibold ${insights.dataSufficiency.eligible ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-[var(--surface-muted)] text-[var(--muted-strong)]"}`}>
            {passedGateCount}/{totalGateCount} checks
          </span>
        </div>
        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
          {insights.dataSufficiency.eligible
            ? "The selected data is complete enough for a factual cohort summary."
            : "Current results remain visible, but benchmark and trend claims may stay limited."}
        </p>
        <Link className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]" href={getInsightsHref(filter, "evidence")}>
          Review data checks
          <Icon className="size-3.5" name="arrow-right" />
        </Link>
      </article>
    </section>
  );
}

function OverviewAttention({
  filter,
  insights,
}: {
  filter: InsightsFilter;
  insights: InsightsMetrics;
}) {
  const monetaryGate = insights.dataSufficiency.gates.find((gate) => gate.label === "Monetary evidence");
  const environmentGate = insights.dataSufficiency.gates.find((gate) => gate.label === "Environment certainty");
  const items = [
    insights.overviewSummary.failedDeliveryCount > 0 ? {
      detail: `${insights.overviewSummary.failedDeliveryCount} ${insights.overviewSummary.failedDeliveryCount === 1 ? "message has" : "messages have"} a recorded delivery failure.`,
      href: getInsightsHref(filter, "performance"),
      label: "Review email delivery",
    } : null,
    environmentGate && !environmentGate.passed ? {
      detail: "Some selected cases do not have a confirmed Test or Live environment.",
      href: getInsightsHref(filter, "evidence"),
      label: "Review environment data",
    } : null,
    monetaryGate && !monetaryGate.passed && insights.overviewSummary.totalCaseCount > 0 ? {
      detail: "Some selected cases have incomplete amount or currency information.",
      href: getInsightsHref(filter, "evidence"),
      label: "Review amount data",
    } : null,
  ].filter((item): item is { detail: string; href: string; label: string } => item !== null);

  if (items.length === 0) return null;

  return (
    <section aria-labelledby="insights-attention-heading" className="rounded-[var(--radius-dashboard-card)] border border-[var(--warning)] bg-[var(--warning-soft)] p-5">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-5 shrink-0 text-[var(--warning-text)]" name="alert" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-[var(--foreground)]" id="insights-attention-heading">Needs attention</h2>
          <div className="mt-2 grid gap-2">
            {items.map((item) => (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between" key={item.label}>
                <p className="text-sm text-[var(--muted-strong)]">{item.detail}</p>
                <Link className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]" href={item.href}>
                  {item.label}
                  <Icon className="size-3.5" name="arrow-right" />
                </Link>
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

      <OutcomeSummary insights={insights} />
      <OverviewAttention filter={filter} insights={insights} />
      <OverviewContext filter={filter} insights={insights} />
    </>
  );
}

function InsightsWorkspaceSection({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section>
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-[-0.02em] text-[var(--foreground)]">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--muted)]">{description}</p>
      </div>
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  );
}

function InsightsDisclosure({
  children,
  defaultOpen = false,
  description,
  id,
  status,
  title,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
  description: string;
  id?: string;
  status: string;
  title: string;
}) {
  return (
    <details
      className="group overflow-hidden rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)]"
      id={id}
      open={defaultOpen}
    >
      <summary className="flex list-none cursor-pointer items-start justify-between gap-4 px-5 py-5 sm:px-6 [&::-webkit-details-marker]:hidden">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold tracking-[-0.02em] text-[var(--foreground)]">{title}</h3>
            <span className="rounded-[6px] bg-[var(--surface-muted)] px-2 py-1 text-xs font-medium text-[var(--muted-strong)]">
              {status}
            </span>
          </div>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--muted)]">{description}</p>
        </div>
        <Icon
          className="mt-1 size-4 shrink-0 text-[var(--muted)] transition-transform group-open:rotate-180"
          name="chevron-down"
        />
      </summary>
      <div className="border-t border-[var(--border)] bg-[var(--background)] p-4 sm:p-5">
        <div className="flex flex-col gap-5">{children}</div>
      </div>
    </details>
  );
}

function EvidenceOverview({ insights }: { insights: InsightsMetrics }) {
  const passedGateCount = insights.dataSufficiency.gates.filter((gate) => gate.passed).length;
  const totalGateCount = insights.dataSufficiency.gates.length;
  const attentionCount = insights.measurementQuality.items.filter(
    (item) => item.status === "attention",
  ).length;

  return (
    <section className="rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
            Evidence summary
          </p>
          <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[var(--foreground)]">
            What this view can support
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Check the selected cohort, reporting readiness, and traceability before using these figures externally.
          </p>
        </div>
        <span className="w-fit rounded-[6px] bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--muted-strong)]">
          Read only
        </span>
      </div>

      <dl className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-[10px] bg-[var(--surface-muted)] p-4">
          <dt className="text-xs text-[var(--muted)]">Selected evidence</dt>
          <dd className="mt-1 text-sm font-semibold text-[var(--foreground)]">
            {insights.measurementEvidence.scope.environment}
          </dd>
          <p className="mt-1 text-xs text-[var(--muted)]">{insights.measurementEvidence.scope.audience}</p>
        </div>
        <div className="rounded-[10px] bg-[var(--surface-muted)] p-4">
          <dt className="text-xs text-[var(--muted)]">Baseline readiness</dt>
          <dd className="mt-1 text-sm font-semibold text-[var(--foreground)]">
            {passedGateCount} of {totalGateCount} checks passed
          </dd>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {insights.dataSufficiency.eligible ? "Descriptive reporting is available" : "Reporting remains withheld"}
          </p>
        </div>
        <div className="rounded-[10px] bg-[var(--surface-muted)] p-4">
          <dt className="text-xs text-[var(--muted)]">Quality review</dt>
          <dd className="mt-1 text-sm font-semibold text-[var(--foreground)]">
            {attentionCount === 0 ? "No open cautions" : `${attentionCount} ${attentionCount === 1 ? "caution" : "cautions"}`}
          </dd>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Contract {insights.measurementEvidence.traceability.contractVersion}
          </p>
        </div>
      </dl>
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
        <InsightFilters filter={filter} view={view} />

        {view === "overview" ? (
          <InsightsOverview filter={filter} insights={insights} />
        ) : null}

        {view === "performance" ? (
          <InsightsWorkspaceSection
            description="Inspect recovery outcomes, audience patterns, delivery health, and engagement for the selected evidence."
            title="Performance details"
          >
            <SequenceSummaryCard metrics={insights.sequenceSummary} />
            <InsightsDisclosure
              description="Compare subscription, standalone, and unconfirmed invoice cohorts without mixing them together."
              status={`${insights.segmentBreakdown.length} audiences`}
              title="Audience breakdown"
            >
              <SegmentBreakdown rows={insights.segmentBreakdown} />
            </InsightsDisclosure>
            <InsightsDisclosure
              description="Review provider outcomes, unique engagement, and recoveries observed after the latest prior email."
              status={insights.deliveryHealth.deliveryRate === null ? "Awaiting outcomes" : `${insights.deliveryHealth.deliveryRate}% delivered`}
              title="Email delivery and engagement"
            >
              <DeliveryHealthCard metric={insights.deliveryHealth} />
              <EmailEngagementCard metric={insights.emailEngagement} />
              <EmailRecoveryTable rows={insights.emailRecovery} />
            </InsightsDisclosure>
            <InsightsDisclosure
              description="Inspect the delivery funnel and supporting operational status only when you need the extra detail."
              status="Read only"
              title="Operational detail"
            >
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
            </InsightsDisclosure>
          </InsightsWorkspaceSection>
        ) : null}

        {view === "evidence" ? (
          <InsightsWorkspaceSection
            description="Review the cohort definition, readiness checks, exact boundaries, calculation contract, and sanitized evidence export."
            title="Evidence & methodology"
          >
            <EvidenceOverview insights={insights} />
            <InsightsDisclosure
              description="See the cohort definition, maturity, amount basis, and limitations behind the selected figures."
              status={insights.measurementQuality.items.some((item) => item.status === "attention") ? "Review cautions" : "Clear"}
              title="Evidence context"
            >
              <MeasurementQualityPanel metric={insights.measurementQuality} />
            </InsightsDisclosure>
            <InsightsDisclosure
              description="Confirm the selected evidence has enough cases, mature outcomes, valid currency data, and environment information."
              status={insights.dataSufficiency.eligible ? "Ready" : `${insights.dataSufficiency.gates.filter((gate) => gate.passed).length} of ${insights.dataSufficiency.gates.length} checks`}
              title="Baseline readiness"
            >
              <DataSufficiencyPanel metric={insights.dataSufficiency} />
            </InsightsDisclosure>
            <InsightsDisclosure
              description="Review the factual cohort summary and adjacent-period comparison only when their evidence checks pass."
              status={insights.baselineSummary.available && insights.cohortComparison.available ? "Available" : "Withheld where incomplete"}
              title="Descriptive reporting"
            >
              <div className="grid gap-5 xl:grid-cols-2">
                <DescriptiveBaselinePanel metric={insights.baselineSummary} />
                <CohortComparisonPanel metric={insights.cohortComparison} />
              </div>
            </InsightsDisclosure>
            <InsightsDisclosure
              description="Inspect exact boundaries, the measurement contract, fingerprint, sanitized export, and verification workflow."
              id="measurement-evidence-heading"
              status="Export & verify"
              title="Audit record"
            >
              <MeasurementEvidencePanel metric={insights.measurementEvidence} />
            </InsightsDisclosure>
          </InsightsWorkspaceSection>
        ) : null}
      </div>
    </div>
  );
}
