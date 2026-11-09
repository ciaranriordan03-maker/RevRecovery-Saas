import Link from "next/link";
import type { ActivationReadiness } from "../../lib/recovery/activation-readiness";
import type { RecoveryHealthSummary } from "../../lib/recovery/recovery-health";
import type { RecoveryFlowView } from "../../lib/recovery/recovery-view";
import type { UserSettings } from "../../lib/settings";
import { Icon } from "../ui-icon";
import { ActivationReadinessChecklist } from "./activation-readiness-checklist";
import { RecoveryHealthBanner } from "./recovery-health-banner";
import { RecoveryMessageEditor } from "./recovery-message-editor";

const modeLabels = {
  live: "Live",
  off: "Off",
  paused: "Paused",
  test: "Test",
} as const;

function SummaryCard({
  detail,
  label,
  tone = "default",
  value,
}: {
  detail?: string;
  label: string;
  tone?: "attention" | "default" | "healthy" | "primary";
  value: number | string;
}) {
  const toneClass = {
    attention: "bg-[var(--warning-soft)] text-[var(--warning-text)]",
    default: "bg-[var(--surface)] text-[var(--foreground)]",
    healthy: "bg-[var(--success-soft)] text-[var(--success)]",
    primary: "bg-[var(--primary-soft)] text-[var(--primary)]",
  }[tone];

  return (
    <div className="rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
      <p className={`mt-2 w-fit rounded-[6px] px-2 py-1 text-sm font-semibold ${toneClass}`}>
        {value}
      </p>
      {detail ? (
        <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{detail}</p>
      ) : null}
    </div>
  );
}

function RecoveryDisclosure({
  children,
  defaultOpen = false,
  description,
  status,
  title,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
  description: string;
  status: string;
  title: string;
}) {
  return (
    <details
      className="group overflow-hidden rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)]"
      open={defaultOpen}
    >
      <summary className="flex list-none cursor-pointer items-start justify-between gap-4 px-5 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
            <span className="rounded-[6px] bg-[var(--surface-muted)] px-2 py-1 text-xs font-medium text-[var(--muted-strong)]">
              {status}
            </span>
          </div>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--muted)]">
            {description}
          </p>
        </div>
        <Icon
          className="mt-1 size-4 shrink-0 text-[var(--muted)] transition-transform group-open:rotate-180"
          name="chevron-down"
        />
      </summary>
      <div className="border-t border-[var(--border)] bg-[var(--background)] p-4 sm:p-5">
        {children}
      </div>
    </details>
  );
}

export function MessagesAndTimingWorkspace({
  recoveryView,
  userSettings,
}: {
  recoveryView: RecoveryFlowView;
  userSettings: UserSettings;
}) {
  return (
    <div className="flex flex-col gap-5">
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Delivery mode" tone="primary" value={modeLabels[recoveryView.mode]} />
        <SummaryCard label="Sequence" value={recoveryView.scheduleLabel} />
        <SummaryCard label="Timezone" value={recoveryView.timezone} />
        <SummaryCard label="Saved messages" tone="healthy" value={recoveryView.messages.length} />
      </dl>

      <RecoveryMessageEditor
        initialSettings={userSettings}
        recoveryView={recoveryView}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Link
          className="inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--text-subtle)] transition hover:bg-[var(--surface-muted)]"
          href="/dashboard/recovery?step=customize#email-identity"
        >
          Advanced message settings
        </Link>
        <Link
          className="inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] bg-[var(--primary)] px-4 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)]"
          href="/dashboard/recovery?step=review"
        >
          Review flow
        </Link>
      </div>
    </div>
  );
}

export function SafetyWorkspace({
  health,
  readiness,
}: {
  health: RecoveryHealthSummary;
  readiness: ActivationReadiness;
}) {
  const completeCount = readiness.checks.filter(
    (check) => check.status === "complete",
  ).length;
  const attentionCount = readiness.checks.length - completeCount;
  const readinessLabel = {
    attention_required: "Attention required",
    not_ready: "Setup incomplete",
    ready_for_live: "Ready for live review",
    ready_for_test: "Ready to test",
  }[readiness.state];
  const healthLabel = {
    attention: "Needs attention",
    healthy: "Operational",
    monitoring: "Monitoring",
  }[health.state];

  return (
    <div className="flex flex-col gap-5">
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Recovery health"
          tone={health.state === "healthy" ? "healthy" : health.state === "attention" ? "attention" : "primary"}
          value={healthLabel}
        />
        <SummaryCard label="Activation state" tone="primary" value={readinessLabel} />
        <SummaryCard label="Safeguards complete" tone="healthy" value={`${completeCount} of ${readiness.checks.length}`} />
        <SummaryCard
          label="Items to review"
          tone={attentionCount > 0 ? "attention" : "healthy"}
          value={attentionCount}
        />
      </dl>

      <RecoveryDisclosure
        defaultOpen={health.state === "attention"}
        description="Current monitoring state and the permanent boundary that prevents this view from changing delivery."
        status="Read only"
        title="Recovery health details"
      >
        <RecoveryHealthBanner health={health} />
      </RecoveryDisclosure>

      <RecoveryDisclosure
        defaultOpen={attentionCount > 0}
        description="Each dependency required before controlled testing or a separately reviewed activation."
        status={`${completeCount} of ${readiness.checks.length} complete`}
        title="Activation checklist"
      >
        <ActivationReadinessChecklist readiness={readiness} />
      </RecoveryDisclosure>
    </div>
  );
}
