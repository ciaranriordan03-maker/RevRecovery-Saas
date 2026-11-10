import Link from "next/link";
import type {
  DataSufficiencyMetric,
  InsightsFilter,
  InsightsMetrics,
  MeasurementEvidenceMetric,
} from "../../lib/server/insights-metrics";
import { Icon } from "../ui-icon";
import { MeasurementManifestVerification } from "./measurement-manifest-verification";

type ReadinessGate = DataSufficiencyMetric["gates"][number];

type FriendlyCheck = {
  detail: string;
  label: string;
  state: "not-applicable" | "ready" | "waiting";
  value: string;
};

const gateLabels: Record<string, string> = {
  "Environment certainty": "Test or Live classification",
  "Monetary evidence": "Amount and currency data",
  "Outcome maturity": "Completed outcomes",
  "Sample size": "Cases collected",
};

const environmentLabels: Record<InsightsFilter["environment"], string> = {
  live: "Live data",
  test: "Test data",
  unconfirmed: "Environment unconfirmed",
};

const periodLabels: Record<InsightsFilter["period"], string> = {
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  all: "All time",
};

const segmentLabels: Record<InsightsFilter["segment"], string> = {
  all: "All audiences",
  standalone: "Standalone invoices",
  subscription: "Subscriptions",
  unknown: "Unknown audience",
};

function getInsightsHref(filter: InsightsFilter, view: "overview" | "performance") {
  return `/dashboard/insights?environment=${filter.environment}&period=${filter.period}&segment=${filter.segment}&view=${view}`;
}

function getGate(metric: DataSufficiencyMetric, label: string) {
  return metric.gates.find((gate) => gate.label === label);
}

function getCompletedOutcomeCount(insights: InsightsMetrics) {
  return insights.overviewSummary.recoveredCaseCount + insights.overviewSummary.otherClosedCaseCount;
}

function friendlyGate(
  gate: ReadinessGate,
  filter: InsightsFilter,
  totalCaseCount: number,
  completedOutcomeCount: number,
): FriendlyCheck {
  if (gate.label === "Sample size") {
    return {
      detail: gate.passed
        ? "There are enough selected cases for a dependable descriptive baseline."
        : "Keep collecting cases. Baseline reporting appears automatically when the required sample is reached.",
      label: gateLabels[gate.label],
      state: gate.passed ? "ready" : "waiting",
      value: gate.value,
    };
  }

  if (gate.label === "Outcome maturity") {
    const threshold = gate.detail.match(/threshold is (\d+)%/)?.[1] ?? "80";
    return {
      detail: gate.passed
        ? "Enough selected cases have reached a recorded final outcome."
        : `Reliable reporting needs at least ${threshold}% of selected cases to reach a final outcome. This updates automatically as cases progress.`,
      label: gateLabels[gate.label],
      state: gate.passed ? "ready" : "waiting",
      value: completedOutcomeCount === 0 && totalCaseCount > 0
        ? "No cases have reached a final outcome yet"
        : `${completedOutcomeCount} of ${totalCaseCount} cases complete`,
    };
  }

  if (gate.label === "Monetary evidence") {
    return {
      detail: gate.passed
        ? "Every selected case has a usable amount and currency. Currencies remain reported separately."
        : "Some selected cases are missing a usable amount or currency, so monetary summaries remain limited.",
      label: gateLabels[gate.label],
      state: gate.passed ? "ready" : "waiting",
      value: gate.value,
    };
  }

  return {
    detail: gate.passed
      ? `Every selected case is confirmed as ${filter.environment === "live" ? "Live" : "Test"} data.`
      : filter.environment === "unconfirmed"
        ? "Choose confirmed Test or Live data before using this view for environment-specific reporting."
        : "Some selected cases are missing a confirmed Test or Live classification.",
    label: gateLabels[gate.label] ?? gate.label,
    state: gate.passed ? "ready" : "waiting",
    value: gate.value,
  };
}

function buildFriendlyChecks(filter: InsightsFilter, insights: InsightsMetrics) {
  const completedOutcomeCount = getCompletedOutcomeCount(insights);
  const checks = insights.dataSufficiency.gates.map((gate) =>
    friendlyGate(
      gate,
      filter,
      insights.overviewSummary.totalCaseCount,
      completedOutcomeCount,
    ),
  );
  const adjacentComparison = insights.measurementEvidence.gateOutcomes.find(
    (gate) => gate.label === "Adjacent comparison",
  );

  checks.push({
    detail: filter.period === "all"
      ? "Choose a 30-day or 90-day period when you want to compare two adjacent periods."
      : adjacentComparison?.passed
        ? "Both adjacent periods have enough reliable data for an observed comparison."
        : "Both adjacent periods need to meet the same reporting checks before a comparison appears.",
    label: "Period comparison",
    state: filter.period === "all"
      ? "not-applicable"
      : adjacentComparison?.passed
        ? "ready"
        : "waiting",
    value: filter.period === "all"
      ? "Not used for an all-time view"
      : adjacentComparison?.value ?? "Waiting for enough data",
  });

  return checks;
}

function DataQualityStatus({
  checks,
  filter,
  insights,
}: {
  checks: FriendlyCheck[];
  filter: InsightsFilter;
  insights: InsightsMetrics;
}) {
  const hasCases = insights.overviewSummary.totalCaseCount > 0;
  const amountGate = getGate(insights.dataSufficiency, "Monetary evidence");
  const environmentGate = getGate(insights.dataSufficiency, "Environment certainty");
  const needsAttention = hasCases && (!amountGate?.passed || !environmentGate?.passed);
  const reportingReady = insights.dataSufficiency.eligible && (
    filter.period === "all" || insights.cohortComparison.available
  );
  const waitingChecks = checks.filter((check) => check.state === "waiting");
  const readyChecks = checks.filter((check) => check.state === "ready");

  const status = !hasCases
    ? {
        detail: "No failed-payment cases match the selected data yet. Reporting checks will begin automatically when cases arrive.",
        icon: "chart",
        label: "No data available yet",
        tone: "border-[var(--border)] bg-[var(--surface)]",
        toneIcon: "bg-[var(--surface-muted)] text-[var(--muted-strong)]",
      }
    : needsAttention
      ? {
          detail: "Some selected records are missing information needed for trustworthy monetary or environment-specific reporting.",
          icon: "alert",
          label: "Data quality needs attention",
          tone: "border-[var(--warning)] bg-[var(--warning-soft)]",
          toneIcon: "bg-[var(--surface)] text-[var(--warning-text)]",
        }
      : reportingReady
        ? {
            detail: "The selected data meets the current requirements for descriptive reporting.",
            icon: "check-circle",
            label: "Reporting ready",
            tone: "border-[var(--success-badge)] bg-[var(--success-soft)]",
            toneIcon: "bg-[var(--surface)] text-[var(--success)]",
          }
        : {
            detail: "Operational figures are available, but dependable baselines and comparisons need more completed cases.",
            icon: "clock",
            label: "More data needed for reliable comparisons",
            tone: "border-[var(--primary-border)] bg-[var(--primary-soft)]",
            toneIcon: "bg-[var(--surface)] text-[var(--primary)]",
          };

  return (
    <section
      aria-labelledby="data-quality-status-heading"
      className={`rounded-[var(--radius-dashboard-card)] border p-5 sm:p-6 ${status.tone}`}
    >
      <div className="flex items-start gap-4">
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-[10px] ${status.toneIcon}`}>
          <Icon className="size-5" name={status.icon} />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
            Reporting status
          </p>
          <h3
            className="mt-1 text-lg font-semibold tracking-[-0.02em] text-[var(--foreground)]"
            id="data-quality-status-heading"
          >
            {status.label}
          </h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--muted-strong)]">
            {status.detail}
          </p>
        </div>
      </div>

      {hasCases && waitingChecks.length > 0 ? (
        <div className="mt-5 border-t border-[var(--border)] pt-5">
          <h4 className="text-sm font-semibold text-[var(--foreground)]">
            {needsAttention ? "What needs attention" : "What is still developing"}
          </h4>
          <div className="mt-3 divide-y divide-[var(--border)]">
            {waitingChecks.map((check) => (
              <div className="grid gap-2 py-3 first:pt-0 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] sm:gap-6" key={check.label}>
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">{check.label}</p>
                  <p className="mt-0.5 text-sm text-[var(--muted-strong)]">{check.value}</p>
                </div>
                <p className="text-xs leading-5 text-[var(--muted)]">{check.detail}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {readyChecks.length > 0 ? (
        <p className="mt-4 border-t border-[var(--border)] pt-4 text-xs leading-5 text-[var(--muted-strong)]">
          <span className="font-medium text-[var(--foreground)]">Already complete:</span>{" "}
          {readyChecks.map((check) => check.label).join(" and ")}.
        </p>
      ) : null}
    </section>
  );
}

function SelectedDataContext({ filter }: { filter: InsightsFilter }) {
  return (
    <div aria-label="Selected data" className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted-strong)]">
      <span className="font-medium text-[var(--muted)]">Selected data</span>
      {[environmentLabels[filter.environment], segmentLabels[filter.segment], periodLabels[filter.period]].map((label) => (
        <span className="rounded-[6px] bg-[var(--surface-muted)] px-2.5 py-1 font-medium" key={label}>
          {label}
        </span>
      ))}
    </div>
  );
}

function ReportingAvailability({
  filter,
  insights,
}: {
  filter: InsightsFilter;
  insights: InsightsMetrics;
}) {
  const completedOutcomeCount = getCompletedOutcomeCount(insights);
  const availableItems = [
    {
      detail: `${insights.overviewSummary.totalCaseCount} selected`,
      label: "Operational case counts",
    },
    {
      detail: `${insights.deliveryHealth.terminalOutcomeCount} final delivery outcomes`,
      label: "Message-delivery outcomes",
    },
    {
      detail: `${insights.emailEngagement.deliveredCount} delivered messages tracked`,
      label: "Recorded customer engagement",
    },
    {
      detail: `${completedOutcomeCount} completed cases`,
      label: "Recorded payment outcomes",
    },
  ];
  const developingItems = [
    !insights.baselineSummary.available
      ? "A dependable descriptive baseline"
      : null,
    filter.period !== "all" && !insights.cohortComparison.available
      ? "Adjacent-period comparisons"
      : null,
    !getGate(insights.dataSufficiency, "Outcome maturity")?.passed
      ? "Mature recovery-rate reporting"
      : null,
  ].filter((item): item is string => item !== null);

  return (
    <section
      aria-labelledby="reporting-availability-heading"
      className="rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
    >
      <h3 className="text-base font-semibold tracking-[-0.02em] text-[var(--foreground)]" id="reporting-availability-heading">
        What you can rely on
      </h3>
      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
        Operational figures remain visible while dependable benchmarks develop.
      </p>

      <div className="mt-5 grid gap-6 lg:grid-cols-2 lg:gap-10">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--success)]">Available now</h4>
          <ul className="mt-3 divide-y divide-[var(--border)]">
            {availableItems.map((item) => (
              <li className="flex items-start gap-3 py-3 first:pt-0" key={item.label}>
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success)]">
                  <Icon className="size-3" name="check" />
                </span>
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">{item.label}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">{item.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-[var(--border)] pt-5 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
          {developingItems.length > 0 ? (
            <>
              <h4 className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">Still developing</h4>
              <ul className="mt-3 space-y-3">
                {developingItems.map((item) => (
                  <li className="flex items-start gap-3 text-sm text-[var(--muted-strong)]" key={item}>
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--border-strong)]" />
                    {item}
                  </li>
                ))}
              </ul>
              {filter.period === "all" ? (
                <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
                  Choose 30 or 90 days when you want to compare adjacent periods.
                </p>
              ) : null}
            </>
          ) : (
            <>
              <h4 className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--success)]">Ready to use</h4>
              <p className="mt-3 text-sm leading-6 text-[var(--muted-strong)]">
                The selected data supports the available descriptive reporting and period comparison.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link className="text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]" href={getInsightsHref(filter, "overview")}>Open Overview</Link>
                <Link className="text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]" href={getInsightsHref(filter, "performance")}>Open Performance</Link>
              </div>
            </>
          )}
        </div>
      </div>

      {!insights.baselineSummary.available || (filter.period !== "all" && !insights.cohortComparison.available) ? (
        <p className="mt-5 border-t border-[var(--border)] pt-4 text-xs leading-5 text-[var(--muted)]">
          Baseline and period comparisons will appear automatically when enough cases have completed.
        </p>
      ) : null}
    </section>
  );
}

function ReportingReadiness({ checks }: { checks: FriendlyCheck[] }) {
  return (
    <details className="group rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)]">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded-[var(--radius-dashboard-card)] px-5 py-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] sm:px-6 [&::-webkit-details-marker]:hidden">
        <div>
          <h3 className="text-base font-semibold tracking-[-0.02em] text-[var(--foreground)]">View all readiness checks</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">See the complete reporting checklist, including checks that have already passed.</p>
        </div>
        <Icon className="mt-1 size-4 shrink-0 text-[var(--muted)] transition-transform group-open:rotate-180" name="chevron-down" />
      </summary>
      <div className="border-t border-[var(--border)] px-5 py-2 sm:px-6">
        <dl className="divide-y divide-[var(--border)]">
          {checks.map((check) => (
            <div className="grid gap-2 py-4 sm:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] sm:gap-6" key={check.label}>
              <div>
                <dt className="text-sm font-medium text-[var(--foreground)]">{check.label}</dt>
                <dd className="mt-1 text-xs text-[var(--muted-strong)]">{check.value}</dd>
              </div>
              <div>
                <span className={`inline-flex rounded-[6px] px-2 py-1 text-xs font-medium ${check.state === "ready" ? "bg-[var(--success-soft)] text-[var(--success)]" : check.state === "waiting" ? "bg-[var(--warning-soft)] text-[var(--warning-text)]" : "bg-[var(--surface-muted)] text-[var(--muted-strong)]"}`}>
                  {check.state === "ready" ? "Complete" : check.state === "waiting" ? "Waiting" : "Not applicable"}
                </span>
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{check.detail}</p>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </details>
  );
}

function MethodologyDisclosure() {
  const definitions = [
    {
      label: "Included failed-payment cases",
      value: "Cases first recorded during the selected period and matching the selected Test or Live environment and audience.",
    },
    {
      label: "Completed outcome",
      value: "A case is complete when it is recorded as recovered, exhausted, cancelled by the merchant, or no longer applicable.",
    },
    {
      label: "Observed recovery share",
      value: "Recorded recovered cases divided by all completed cases in the selected data.",
    },
    {
      label: "Amount represented",
      value: "The amount due when each payment failure was recorded, kept separate by currency.",
    },
    {
      label: "Period comparison",
      value: "The current period value minus the previous adjacent period value, after both periods pass the same readiness checks.",
    },
  ];

  return (
    <details className="group rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)]">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded-[var(--radius-dashboard-card)] px-5 py-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] sm:px-6 [&::-webkit-details-marker]:hidden">
        <div>
          <h3 className="text-base font-semibold tracking-[-0.02em] text-[var(--foreground)]">How these numbers are calculated</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">A plain-language guide to what is included and what the figures can support.</p>
        </div>
        <Icon className="mt-1 size-4 shrink-0 text-[var(--muted)] transition-transform group-open:rotate-180" name="chevron-down" />
      </summary>
      <div className="border-t border-[var(--border)] px-5 py-5 sm:px-6">
        <dl className="grid gap-x-8 gap-y-5 md:grid-cols-2">
          {definitions.map((definition) => (
            <div key={definition.label}>
              <dt className="text-sm font-medium text-[var(--foreground)]">{definition.label}</dt>
              <dd className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">{definition.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 rounded-[10px] bg-[var(--surface-muted)] p-4">
          <h4 className="text-sm font-medium text-[var(--foreground)]">Important limits</h4>
          <ul className="mt-2 space-y-2 text-xs leading-5 text-[var(--muted-strong)]">
            <li>Reporting is descriptive, not causal.</li>
            <li>An email occurring before a recovery does not prove that it caused the recovery.</li>
            <li>Failure-time invoice amounts are not automatically confirmed collected revenue.</li>
            <li>Period changes are observed differences, not performance lift or incremental revenue.</li>
          </ul>
        </div>
      </div>
    </details>
  );
}

export function AdvancedMeasurementEvidence({ metric }: { metric: MeasurementEvidenceMetric }) {
  const manifestJson = `${JSON.stringify(metric.exportManifest, null, 2)}\n`;
  const manifestFilename = `revrecovery-insights-evidence-${metric.evaluatedAt.replace(/[:.]/g, "-")}.json`;
  const manifestHref = `data:application/json;charset=utf-8,${encodeURIComponent(manifestJson)}`;

  return (
    <details
      className="group rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)]"
      id="measurement-evidence-heading"
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded-[var(--radius-dashboard-card)] px-5 py-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] sm:px-6 [&::-webkit-details-marker]:hidden">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold tracking-[-0.02em] text-[var(--foreground)]">Advanced technical evidence</h3>
            <span className="rounded-[6px] bg-[var(--surface-muted)] px-2 py-1 text-xs font-medium text-[var(--muted-strong)]">Export &amp; verify</span>
          </div>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--muted)]">Detailed scope, fingerprints and local verification for support, audit and troubleshooting.</p>
        </div>
        <Icon className="mt-1 size-4 shrink-0 text-[var(--muted)] transition-transform group-open:rotate-180" name="chevron-down" />
      </summary>

      <div className="border-t border-[var(--border)] px-5 py-5 sm:px-6">
        <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
          <section aria-labelledby="advanced-scope-heading">
            <h4 className="text-sm font-semibold text-[var(--foreground)]" id="advanced-scope-heading">Exact selected scope</h4>
            <dl className="mt-3 space-y-3 text-xs">
              <div><dt className="text-[var(--muted)]">Environment</dt><dd className="mt-1 break-words font-mono text-[var(--foreground)]">{metric.scope.environment}</dd></div>
              <div><dt className="text-[var(--muted)]">Audience</dt><dd className="mt-1 break-words font-mono text-[var(--foreground)]">{metric.scope.audience}</dd></div>
              <div><dt className="text-[var(--muted)]">Evaluation timestamp</dt><dd className="mt-1 break-words font-mono text-[var(--foreground)]"><time dateTime={metric.evaluatedAt}>{metric.evaluatedAt}</time></dd></div>
            </dl>
          </section>

          <section aria-labelledby="advanced-boundaries-heading">
            <h4 className="text-sm font-semibold text-[var(--foreground)]" id="advanced-boundaries-heading">Exact cohort boundaries</h4>
            <dl className="mt-3 space-y-3 text-xs">
              <div><dt className="text-[var(--muted)]">Current</dt><dd className="mt-1 break-words font-mono leading-5 text-[var(--foreground)]">{metric.boundaries.current}</dd></div>
              <div><dt className="text-[var(--muted)]">Previous</dt><dd className="mt-1 break-words font-mono leading-5 text-[var(--foreground)]">{metric.boundaries.previous}</dd></div>
            </dl>
          </section>
        </div>

        <section aria-labelledby="traceability-heading" className="mt-6 border-t border-[var(--border)] pt-5">
          <h4 className="text-sm font-semibold text-[var(--foreground)]" id="traceability-heading">Measurement traceability</h4>
          <dl className="mt-3 grid gap-4 sm:grid-cols-2">
            <div><dt className="text-xs text-[var(--muted)]">Contract version</dt><dd className="mt-1 break-all font-mono text-xs text-[var(--foreground)]">{metric.traceability.contractVersion}</dd></div>
            <div><dt className="text-xs text-[var(--muted)]">Fingerprint algorithm</dt><dd className="mt-1 font-mono text-xs text-[var(--foreground)]">{metric.traceability.fingerprintAlgorithm}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs text-[var(--muted)]">Evidence fingerprint</dt><dd className="mt-1 break-all font-mono text-xs leading-5 text-[var(--foreground)]">{metric.traceability.evidenceFingerprint}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs text-[var(--muted)]">Fingerprint basis</dt><dd className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">{metric.traceability.fingerprintBasis}</dd></div>
          </dl>
        </section>

        <section aria-labelledby="manifest-export-heading" className="mt-6 border-t border-[var(--border)] pt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h4 className="text-sm font-semibold text-[var(--foreground)]" id="manifest-export-heading">Sanitized JSON export</h4>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--muted)]">Download this exact measurement context without row-level customer or case data.</p>
            </div>
            <a
              className="inline-flex h-9 w-fit items-center justify-center rounded-[var(--radius-control)] border border-[var(--primary)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--primary)] transition hover:bg-[var(--primary-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
              download={manifestFilename}
              href={manifestHref}
            >
              Download JSON
            </a>
          </div>
          <p className="mt-3 text-xs text-[var(--muted-strong)]">
            Manifest version: <span className="break-all font-mono">{metric.exportManifest.manifestVersion}</span>
          </p>
          <details className="group/json mt-3 rounded-[8px] bg-[var(--surface-muted)] p-3">
            <summary className="cursor-pointer list-none text-xs font-medium text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] [&::-webkit-details-marker]:hidden">Preview sanitized JSON</summary>
            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-5 text-[var(--muted-strong)]">{manifestJson}</pre>
          </details>
        </section>

        <MeasurementManifestVerification
          currentManifest={metric.exportManifest}
          key={`${metric.exportManifest.evaluatedAt}:${metric.exportManifest.fingerprint.value}`}
        />

        <div className="mt-6 grid gap-6 border-t border-[var(--border)] pt-5 lg:grid-cols-2">
          <section aria-labelledby="advanced-gates-heading">
            <h4 className="text-sm font-semibold text-[var(--foreground)]" id="advanced-gates-heading">Gate outcomes</h4>
            <dl className="mt-3 divide-y divide-[var(--border)]">
              {metric.gateOutcomes.map((gate) => (
                <div className="flex items-start justify-between gap-3 py-3 first:pt-0" key={gate.label}>
                  <div><dt className="text-xs font-medium text-[var(--foreground)]">{gate.label}</dt><dd className="mt-1 text-xs leading-5 text-[var(--muted)]">{gate.value}</dd></div>
                  <span className={`shrink-0 rounded-[6px] px-2 py-1 text-xs font-medium ${gate.passed ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-[var(--warning-soft)] text-[var(--warning-text)]"}`}>{gate.passed ? "Pass" : "Waiting"}</span>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="advanced-definitions-heading">
            <h4 className="text-sm font-semibold text-[var(--foreground)]" id="advanced-definitions-heading">Full calculation definitions</h4>
            <dl className="mt-3 divide-y divide-[var(--border)]">
              {metric.definitions.map((definition) => (
                <div className="py-3 first:pt-0" key={definition.label}>
                  <dt className="text-xs font-medium text-[var(--foreground)]">{definition.label}</dt>
                  <dd className="mt-1 text-xs leading-5 text-[var(--muted)]">{definition.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <p className="mt-5 border-t border-[var(--border)] pt-4 text-xs leading-5 text-[var(--muted)]">{metric.summary}</p>
      </div>
    </details>
  );
}

export function InsightsDataQuality({
  filter,
  insights,
}: {
  filter: InsightsFilter;
  insights: InsightsMetrics;
}) {
  const checks = buildFriendlyChecks(filter, insights);

  return (
    <section aria-labelledby="data-quality-heading">
      <header>
        <h2 className="text-xl font-semibold tracking-[-0.025em] text-[var(--foreground)]" id="data-quality-heading">Data quality</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">See whether your selected data is ready for reliable reporting.</p>
        <p className="mt-2 text-xs leading-5 text-[var(--muted)]">This page explains reporting readiness only. It does not change recovery data or settings.</p>
      </header>

      <div className="mt-5">
        <SelectedDataContext filter={filter} />
      </div>

      <div className="mt-5 flex flex-col gap-5">
        <DataQualityStatus checks={checks} filter={filter} insights={insights} />
        <ReportingAvailability filter={filter} insights={insights} />
        <ReportingReadiness checks={checks} />
        <MethodologyDisclosure />
        <AdvancedMeasurementEvidence metric={insights.measurementEvidence} />
      </div>
    </section>
  );
}
