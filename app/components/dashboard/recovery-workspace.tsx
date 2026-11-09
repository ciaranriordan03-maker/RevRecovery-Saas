import Link from "next/link";
import type {
  ActivationReadiness,
  ActivationReadinessCheck,
  ActivationReadinessState,
} from "../../lib/recovery/activation-readiness";
import type { RecoveryHealthSummary } from "../../lib/recovery/recovery-health";
import type { RecoveryOpportunityReport } from "../../lib/recovery/opportunity-report";
import type { RecoveryFlowView } from "../../lib/recovery/recovery-view";
import type { AtRiskCustomer } from "../../lib/server/at-risk-customers";
import { Icon } from "../ui-icon";
import { AtRiskCustomersTable } from "./at-risk-customers-table";

export type RecoveryWorkspaceView =
  | "overview"
  | "flow"
  | "safety";

const modeLabels = {
  live: "Live mode",
  off: "Off",
  paused: "Paused",
  test: "Test mode",
} as const;

const modeScopeCopy: Record<RecoveryFlowView["mode"], string> = {
  live: "Live recovery mode is selected. Review the safeguards before making delivery changes.",
  off: "Recovery delivery is off. Failed-payment monitoring can remain available.",
  paused: "Recovery delivery is paused and the saved setup is preserved.",
  test: "Customer delivery is disabled. Test messages are restricted to the approved recipient.",
};

const readinessCopy: Record<
  ActivationReadinessState,
  { detail: string; label: string }
> = {
  attention_required: {
    detail: "A required recovery dependency needs attention.",
    label: "Attention required",
  },
  not_ready: {
    detail: "Finish the required setup before running a controlled test.",
    label: "Setup incomplete",
  },
  ready_for_live: {
    detail: "The recorded safeguards support a separate live-activation review.",
    label: "Ready for live review",
  },
  ready_for_test: {
    detail: "Core setup is complete enough for a controlled test.",
    label: "Ready to test",
  },
};

const checkActions: Partial<
  Record<
    ActivationReadinessCheck["id"],
    { href: string; label: string }
  >
> = {
  controlled_test: {
    href: "/dashboard/recovery?step=customize#controlled-test-plan",
    label: "Review controlled test",
  },
  email_identity: {
    href: "/dashboard/recovery?step=customize#email-identity",
    label: "Complete email settings",
  },
  recovery_configuration: {
    href: "/dashboard/recovery?step=customize#recovery-delivery",
    label: "Configure recovery",
  },
  sending_domain: {
    href: "/dashboard/recovery?step=customize#sending-domain",
    label: "Review sending domain",
  },
  stripe_communication_overlap: {
    href: "/dashboard/recovery?step=customize#stripe-overlap-guidance",
    label: "Review guidance",
  },
  stripe_connection: {
    href: "/dashboard/settings#stripe-integration",
    label: "Review Stripe connection",
  },
  test_recipient: {
    href: "/dashboard/recovery?step=customize#recovery-delivery",
    label: "Review test recipient",
  },
  webhook_health: {
    href: "/dashboard/settings#stripe-integration",
    label: "Review webhook health",
  },
};

const workspaceTabs: ReadonlyArray<{
  href: string;
  label: string;
  value: RecoveryWorkspaceView;
}> = [
  { href: "/dashboard/recovery?view=overview", label: "Overview", value: "overview" },
  { href: "/dashboard/recovery?view=flow", label: "Messages & timing", value: "flow" },
  { href: "/dashboard/recovery?view=safety", label: "Safety & audit", value: "safety" },
];

function StateDot({ tone }: { tone: "attention" | "healthy" | "monitoring" }) {
  const toneClass = {
    attention: "bg-[var(--danger-dot)]",
    healthy: "bg-[var(--chart-green)]",
    monitoring: "bg-[var(--yellow-dot)]",
  }[tone];

  return <span aria-hidden className={`size-2 rounded-full ${toneClass}`} />;
}

function readinessTone(
  state: ActivationReadinessState,
): "attention" | "healthy" | "monitoring" {
  if (state === "attention_required" || state === "not_ready") {
    return "attention";
  }

  return state === "ready_for_live" ? "healthy" : "monitoring";
}

function getNextAction(readiness: ActivationReadiness) {
  const check = readiness.checks.find((item) => item.status !== "complete");

  if (!check) {
    return {
      href: "/dashboard/recovery?step=review",
      label: "Review recovery flow",
    };
  }

  return (
    checkActions[check.id] ?? {
      href: "/dashboard/recovery?step=customize",
      label: "Review recovery settings",
    }
  );
}

export function RecoveryWorkspaceHeader({
  mode,
}: {
  mode: RecoveryFlowView["mode"];
}) {
  return (
    <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[var(--foreground)]">
            Recovery
          </h1>
          <span className="inline-flex rounded-[6px] bg-[var(--primary-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--primary)]">
            {modeLabels[mode]}
          </span>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
          Monitor failed payments, recovery activity, and anything requiring attention.
        </p>
        <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-[var(--muted-strong)]">
          <Icon className="mt-0.5 size-4 shrink-0" name="lock" />
          <span>{modeScopeCopy[mode]}</span>
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          className="inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--text-subtle)] transition hover:bg-[var(--surface-muted)]"
          href="/dashboard/recovery?step=customize"
        >
          View settings
        </Link>
        <Link
          className="inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] bg-[var(--primary)] px-4 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)]"
          href="/dashboard/recovery?step=review"
        >
          Review flow
        </Link>
      </div>
    </header>
  );
}

export function RecoveryWorkspaceNavigation({
  active,
}: {
  active: RecoveryWorkspaceView;
}) {
  return (
    <nav
      aria-label="Recovery views"
      className="overflow-x-auto border-b border-[var(--border)]"
    >
      <div className="flex min-w-max gap-6">
        {workspaceTabs.map((tab) => (
          <Link
            aria-current={active === tab.value ? "page" : undefined}
            className={`border-b-2 px-0.5 pb-3 text-sm font-medium transition-colors ${
              active === tab.value
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
            href={tab.href}
            key={tab.value}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

function OperatingStatus({
  health,
  readiness,
}: {
  health: RecoveryHealthSummary;
  readiness: ActivationReadiness;
}) {
  const nextAction = getNextAction(readiness);
  const readinessSummary = readinessCopy[readiness.state];

  return (
    <section className="overflow-hidden rounded-[var(--radius-dashboard-card)] bg-[var(--primary)] text-white">
      <div className="grid gap-px bg-white/15 md:grid-cols-2">
        <div className="bg-[var(--primary)] p-5 sm:p-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-white/70">
            <StateDot tone={health.state} />
            Recovery health
          </div>
          <h2 className="mt-3 text-lg font-semibold tracking-[-0.02em]">
            {health.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/75">{health.detail}</p>
        </div>
        <div className="bg-[var(--primary)] p-5 sm:p-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-white/70">
            <StateDot tone={readinessTone(readiness.state)} />
            Activation readiness
          </div>
          <h2 className="mt-3 text-lg font-semibold tracking-[-0.02em]">
            {readinessSummary.label}
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/75">
            {readinessSummary.detail}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-white/15 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-xs leading-5 text-white/70">
          Status only. This overview does not enable delivery or change the recovery flow.
        </p>
        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-white/80"
          href={nextAction.href}
        >
          {nextAction.label}
          <Icon className="size-4" name="arrow-right" />
        </Link>
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)] p-5">
      <dt className="text-xs font-medium text-[var(--muted)]">{label}</dt>
      <dd className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
        {value}
      </dd>
    </div>
  );
}

function RecoveryMetrics({
  customers,
  health,
  report,
}: {
  customers: AtRiskCustomer[];
  health: RecoveryHealthSummary;
  report: RecoveryOpportunityReport;
}) {
  const healthLabel = {
    attention: "Needs attention",
    healthy: "Operational",
    monitoring: "Monitoring",
  }[health.state];

  return (
    <section aria-labelledby="recovery-snapshot-heading">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            Current snapshot
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em]" id="recovery-snapshot-heading">
            Recovery at a glance
          </h2>
        </div>
        {report.state === "available" ? (
          <span className="text-xs text-[var(--muted)]">Connection-time Stripe scan</span>
        ) : null}
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Revenue at risk" value={report.revenueAtRisk} />
        <MetricCard label="Open failed-payment cases" value={customers.length} />
        <MetricCard label="Customers at risk" value={report.atRiskCustomersCount} />
        <MetricCard label="Recovery health" value={healthLabel} />
      </dl>
      <details className="group mt-3 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
        <summary className="flex list-none items-center justify-between gap-3 text-sm font-medium text-[var(--muted-strong)] [&::-webkit-details-marker]:hidden">
          About this snapshot
          <Icon className="size-4 transition-transform group-open:rotate-180" name="chevron-down" />
        </summary>
        <p className="mt-3 max-w-3xl text-xs leading-5 text-[var(--muted)]">
          {report.scopeNote}
        </p>
      </details>
    </section>
  );
}

function AttentionPanel({ readiness }: { readiness: ActivationReadiness }) {
  const items = readiness.checks.filter((item) => item.status !== "complete");

  return (
    <section
      aria-labelledby="recovery-attention-heading"
      className="rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)]"
    >
      <div className="border-b border-[var(--border)] px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-[-0.02em]" id="recovery-attention-heading">
              Needs attention
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Setup checks that may affect safe recovery operation.
            </p>
          </div>
          <span className="rounded-[6px] bg-[var(--warning-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--warning-text)]">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="flex items-start gap-3 px-5 py-5 sm:px-6">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success)]">
            <Icon className="size-4" name="check" />
          </span>
          <div>
            <p className="text-sm font-medium">No setup issues need attention</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              Continue to review operational health before any live activation.
            </p>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {items.map((item) => {
            const action = checkActions[item.id];
            return (
              <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6" key={item.id}>
                <div className="flex min-w-0 gap-3">
                  <span
                    aria-hidden
                    className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${
                      item.status === "required"
                        ? "bg-[var(--danger-soft)] text-[var(--danger)]"
                        : "bg-[var(--warning-soft)] text-[var(--warning-text)]"
                    }`}
                  >
                    <Icon className="size-4" name="alert" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">{item.label}</h3>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{item.detail}</p>
                  </div>
                </div>
                {action ? (
                  <Link
                    className="ml-11 inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] sm:ml-0"
                    href={action.href}
                  >
                    {action.label}
                    <Icon className="size-4" name="arrow-right" />
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function RecoveryMessageCards({
  collapsible = false,
  recoveryView,
}: {
  collapsible?: boolean;
  recoveryView: RecoveryFlowView;
}) {
  return (
    <section className="flex flex-col gap-4">
      {recoveryView.messages.map((message, index) => {
        const iconName = index === 0 ? "refresh" : index === 1 ? "clock" : "check-circle";

        if (collapsible) {
          return (
            <details
              className="group overflow-hidden rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)]"
              key={message.messageKey}
            >
              <summary className="flex list-none cursor-pointer items-center gap-4 px-5 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--primary-soft)] text-[var(--primary)]">
                  <Icon className="size-5" name={iconName} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold">Email {index + 1}</h3>
                    <span className="rounded-[6px] bg-[var(--primary-soft)] px-2 py-1 text-xs font-medium text-[var(--primary)]">
                      {message.timing}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-[var(--muted-strong)]">{message.subject}</p>
                </div>
                <Icon className="size-4 shrink-0 text-[var(--muted)] transition-transform group-open:rotate-180" name="chevron-down" />
              </summary>
              <div className="border-t border-[var(--border)] bg-[var(--background)] px-5 py-4 sm:px-6">
                <p className="text-xs font-medium uppercase tracking-[0.06em] text-[var(--muted)]">Customer preview</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-strong)]">{message.bodyPreview}</p>
              </div>
            </details>
          );
        }

        return (
          <article
            className="rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
            key={message.messageKey}
          >
            <div className="flex gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-[var(--primary-soft)] text-[var(--primary)]">
                <Icon className="size-5" name={iconName} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold tracking-[-0.02em]">Email {index + 1}</h2>
                  <span className="rounded-[6px] bg-[var(--primary-soft)] px-2 py-1 text-xs font-medium text-[var(--primary)]">
                    {message.timing}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-strong)]">{message.bodyPreview}</p>
                <div className="mt-4 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                  <p className="text-xs text-[var(--muted)]">Subject line</p>
                  <p className="mt-1 text-sm text-[var(--foreground)]">{message.subject}</p>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function SequenceOverview({ recoveryView }: { recoveryView: RecoveryFlowView }) {
  return (
    <section
      aria-labelledby="recovery-sequence-heading"
      className="rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)]"
    >
      <div className="flex flex-col gap-3 border-b border-[var(--border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-base font-semibold tracking-[-0.02em]" id="recovery-sequence-heading">
            Recovery sequence
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {recoveryView.scheduleLabel} in {recoveryView.timezone}
          </p>
        </div>
        <Link
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]"
          href="/dashboard/recovery?view=flow"
        >
          View messages & timing
          <Icon className="size-4" name="arrow-right" />
        </Link>
      </div>
      <ol className="grid divide-y divide-[var(--border)] md:grid-cols-3 md:divide-x md:divide-y-0">
        {recoveryView.messages.map((message, index) => (
          <li className="p-5 sm:p-6" key={message.messageKey}>
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-full bg-[var(--primary-soft)] text-xs font-semibold text-[var(--primary)]">
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-semibold">Email {index + 1}</p>
                <p className="text-xs text-[var(--muted)]">{message.timing}</p>
              </div>
            </div>
            <p className="mt-4 text-sm font-medium leading-5 text-[var(--foreground)]">{message.subject}</p>
            <details className="group mt-3">
              <summary className="flex list-none items-center gap-1.5 text-xs font-medium text-[var(--primary)] [&::-webkit-details-marker]:hidden">
                View email
                <Icon className="size-3.5 transition-transform group-open:rotate-180" name="chevron-down" />
              </summary>
              <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{message.bodyPreview}</p>
            </details>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function RecoveryOverview({
  activationReadiness,
  atRiskCustomers,
  opportunityReport,
  recoveryHealth,
  recoveryView,
}: {
  activationReadiness: ActivationReadiness;
  atRiskCustomers: AtRiskCustomer[];
  opportunityReport: RecoveryOpportunityReport;
  recoveryHealth: RecoveryHealthSummary;
  recoveryView: RecoveryFlowView;
}) {
  return (
    <div className="flex flex-col gap-6">
      <OperatingStatus health={recoveryHealth} readiness={activationReadiness} />
      <RecoveryMetrics customers={atRiskCustomers} health={recoveryHealth} report={opportunityReport} />
      <AttentionPanel readiness={activationReadiness} />
      <SequenceOverview recoveryView={recoveryView} />
      <AtRiskCustomersTable customers={atRiskCustomers} />
    </div>
  );
}

export function RecoveryWorkspaceSection({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold tracking-[-0.025em] text-[var(--foreground)]">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">{description}</p>
      </header>
      {children}
    </div>
  );
}
