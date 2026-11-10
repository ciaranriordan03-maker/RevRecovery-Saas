import Link from "next/link";
import type {
  InsightsFilter,
  MeasurementEvidenceMetric,
} from "../../lib/server/insights-metrics";
import { Icon } from "../ui-icon";
import { AdvancedMeasurementEvidence } from "./insights-data-quality";

function DataReportingFilters({ filter }: { filter: InsightsFilter }) {
  const periods = [["30d", "30 days"], ["90d", "90 days"], ["all", "All time"]] as const;
  const segments = [["all", "All audiences"], ["subscription", "Subscriptions"], ["standalone", "Standalone"], ["unknown", "Unknown"]] as const;
  const environments = [["live", "Live"], ["test", "Test"], ["unconfirmed", "Unconfirmed"]] as const;

  return (
    <form
      action="/dashboard/settings/data-reporting"
      className="grid gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
      method="get"
    >
      <label className="grid gap-1.5 text-xs font-medium text-[var(--muted-strong)]">
        Environment
        <select
          className="h-10 min-w-0 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)]"
          defaultValue={filter.environment}
          name="environment"
        >
          {environments.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="grid gap-1.5 text-xs font-medium text-[var(--muted-strong)]">
        Period
        <select
          className="h-10 min-w-0 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)]"
          defaultValue={filter.period}
          name="period"
        >
          {periods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="grid gap-1.5 text-xs font-medium text-[var(--muted-strong)]">
        Audience
        <select
          className="h-10 min-w-0 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)]"
          defaultValue={filter.segment}
          name="segment"
        >
          {segments.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <button
        className="inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
        type="submit"
      >
        Apply
      </button>
    </form>
  );
}

export function InsightsDataReporting({
  filter,
  metric,
}: {
  filter: InsightsFilter;
  metric: MeasurementEvidenceMetric;
}) {
  return (
    <div className="px-5 py-7 sm:px-8 lg:py-8 xl:px-10">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-6">
        <header>
          <Link
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
            href="/dashboard/settings"
          >
            <Icon className="size-4" name="arrow-left" />
            Back to settings
          </Link>
          <h1 className="mt-4 text-2xl font-semibold tracking-[-0.025em] text-[var(--foreground)]">
            Data &amp; reporting
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Advanced measurement evidence for support, audits and troubleshooting.
          </p>
        </header>

        <DataReportingFilters filter={filter} />

        <div className="rounded-[10px] bg-[var(--surface-muted)] px-4 py-3 text-sm leading-6 text-[var(--muted-strong)]">
          These tools are read only. They export and verify reporting context without changing recovery data or settings.
        </div>

        <AdvancedMeasurementEvidence metric={metric} />
      </div>
    </div>
  );
}
