import Link from "next/link";
import type { ControlledTestEligibility } from "../../lib/recovery/controlled-test-plan";
import { recoveryBenefits } from "../../lib/data";
import type { RecoveryFlowView } from "../../lib/recovery/recovery-view";
import type { UserSettings } from "../../lib/settings";
import { Icon } from "../ui-icon";
import { ControlledTestPlan } from "./controlled-test-plan";
import { RecoverySettingsForm } from "./recovery-settings-form";
import { RecoveryMessageCards } from "./recovery-workspace";
import { SendingDomainSettings } from "./sending-domain-settings";

const modeLabels = {
  live: "Live",
  off: "Off",
  paused: "Paused",
  test: "Test",
} as const;

function SettingsMetric({
  detail,
  label,
  tone = "default",
  value,
}: {
  detail?: string;
  label: string;
  tone?: "attention" | "default" | "healthy" | "primary";
  value: string;
}) {
  const valueClass = {
    attention: "bg-[var(--warning-soft)] text-[var(--warning-text)]",
    default: "bg-[var(--surface-muted)] text-[var(--foreground)]",
    healthy: "bg-[var(--success-soft)] text-[var(--success)]",
    primary: "bg-[var(--primary-soft)] text-[var(--primary)]",
  }[tone];

  return (
    <div className="rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <dt className="text-xs font-medium text-[var(--muted)]">{label}</dt>
      <dd className={`mt-2 w-fit rounded-[6px] px-2 py-1 text-sm font-semibold ${valueClass}`}>
        {value}
      </dd>
      {detail ? <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{detail}</p> : null}
    </div>
  );
}

function SettingsDisclosure({
  children,
  description,
  status,
  title,
}: {
  children: React.ReactNode;
  description: string;
  status: string;
  title: string;
}) {
  return (
    <details className="group overflow-hidden rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)]">
      <summary className="flex list-none cursor-pointer items-start justify-between gap-4 px-5 py-5 sm:px-6 [&::-webkit-details-marker]:hidden">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold tracking-[-0.02em] text-[var(--foreground)]">{title}</h2>
            <span className="rounded-[6px] bg-[var(--surface-muted)] px-2 py-1 text-xs font-medium text-[var(--muted-strong)]">
              {status}
            </span>
          </div>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--muted)]">{description}</p>
        </div>
        <Icon className="mt-1 size-4 shrink-0 text-[var(--muted)] transition-transform group-open:rotate-180" name="chevron-down" />
      </summary>
      <div className="border-t border-[var(--border)] bg-[var(--background)] p-4 sm:p-5">
        {children}
      </div>
    </details>
  );
}

function SettingsNavigation() {
  const links = [
    ["#recovery-delivery", "Delivery"],
    ["#email-identity", "Messages"],
    ["#controlled-test-section", "Controlled test"],
    ["#advanced-safeguards", "Delivery safeguards"],
  ] as const;

  return (
    <nav aria-label="Recovery settings sections" className="overflow-x-auto border-b border-[var(--border)]">
      <div className="flex min-w-max gap-6">
        {links.map(([href, label]) => (
          <a className="border-b-2 border-transparent px-0.5 pb-3 text-sm font-medium text-[var(--muted)] transition hover:border-[var(--primary-border)] hover:text-[var(--foreground)]" href={href} key={href}>
            {label}
          </a>
        ))}
      </div>
    </nav>
  );
}

export function RecoverySettingsWorkspace({
  controlledTestEligibility,
  recoveryView,
  userSettings,
}: {
  controlledTestEligibility: ControlledTestEligibility;
  recoveryView: RecoveryFlowView;
  userSettings: UserSettings;
}) {
  const recipient = recoveryView.approvedTestRecipient ?? "Not configured";

  return (
    <div className="px-5 py-7 sm:px-8 lg:px-8 lg:py-8 xl:px-10">
      <div className="mx-auto flex max-w-[960px] flex-col gap-6">
        <section className="flex items-start gap-3 rounded-[var(--radius-dashboard-card)] border border-[var(--primary-border)] bg-[var(--primary-soft)] px-5 py-4 sm:px-6">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--primary)]">
            <Icon className="size-4" name="lock" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Changes apply safely to future cases</h2>
            <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">
              Message copy can be edited here. New cases are assigned to a persisted invoice audience, while existing active sequences keep the configuration snapshot they started with.
            </p>
          </div>
        </section>

        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SettingsMetric label="Recovery mode" tone="primary" value={modeLabels[recoveryView.mode]} />
          <SettingsMetric label="Stripe environment" value={recoveryView.environment} />
          <SettingsMetric label="Schedule" value={recoveryView.scheduleLabel} />
          <SettingsMetric
            detail={recoveryView.mode === "test" ? "Only this address can receive test messages" : undefined}
            label="Approved test recipient"
            tone={recoveryView.approvedTestRecipient ? "healthy" : "attention"}
            value={recipient}
          />
        </dl>

        <SettingsNavigation />

        <section aria-labelledby="core-recovery-settings-heading">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Core setup</p>
            <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em]" id="core-recovery-settings-heading">Delivery and customer messages</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--muted)]">
              Configure who receives recovery messages, when they are scheduled, and the content customers see.
            </p>
          </div>
          <RecoverySettingsForm
            editable={recoveryView.editable}
            initialRecoverySettings={{
              approvedTestRecipient: recoveryView.approvedTestRecipient ?? "",
              mode: recoveryView.mode,
              scheduleId: recoveryView.scheduleId,
              timezone: recoveryView.timezone,
            }}
            initialUserSettings={userSettings}
          />
        </section>

        <div id="controlled-test-section">
          <SettingsDisclosure
            description="Confirm prerequisites and create one clearly labelled synthetic development case without calling Stripe or sending email."
            status={controlledTestEligibility.eligible ? "Eligible" : "Setup required"}
            title="Controlled test"
          >
            <ControlledTestPlan eligibility={controlledTestEligibility} />
          </SettingsDisclosure>
        </div>

        <div id="advanced-safeguards">
          <SettingsDisclosure
            description="Review the customer sending domain and avoid duplicate Stripe messages before live recovery."
            status="Review before live"
            title="Delivery safeguards"
          >
            <div className="flex flex-col gap-5">
              <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6" id="stripe-overlap-guidance">
                <h3 className="text-base font-medium text-[var(--foreground)]">Stripe communication overlap</h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-strong)]">
                  Before going live, review the failed-payment emails enabled in Stripe Billing. Avoid sending materially identical reminders from Stripe and RevRecovery at the same time. Stripe retry settings remain authoritative and RevRecovery does not change them.
                </p>
              </section>
              <SendingDomainSettings />
            </div>
          </SettingsDisclosure>
        </div>

        <SettingsDisclosure
          description="Inspect the customer-facing copy currently saved for future recovery cases."
          status={`${recoveryView.messages.length} messages`}
          title="Saved message preview"
        >
          <p className="mb-4 text-sm leading-6 text-[var(--muted-strong)]">
            These previews show the message copy currently saved for new recovery cases. Existing active sequences keep the configuration snapshot they started with.
          </p>
          <RecoveryMessageCards collapsible recoveryView={recoveryView} />
        </SettingsDisclosure>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Link className="inline-flex h-10 items-center justify-center text-sm font-medium text-[var(--muted-strong)] hover:text-[var(--foreground)]" href="/dashboard/recovery">Back to recovery</Link>
          <Link className="inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] bg-[var(--primary)] px-5 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)]" href="/dashboard/recovery?step=review">Review flow</Link>
        </div>
      </div>
    </div>
  );
}

export function RecoveryReviewWorkspace({
  recoveryView,
}: {
  recoveryView: RecoveryFlowView;
}) {
  return (
    <div className="px-5 py-7 sm:px-8 lg:px-8 lg:py-8 xl:px-10">
      <div className="mx-auto flex max-w-[960px] flex-col gap-6">
        <section className="rounded-[var(--radius-dashboard-card)] bg-[var(--primary)] p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/70">Pre-flight summary</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em]">Review the customer recovery experience</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/75">
            Confirm the saved timing, sender, and customer messages. This screen is read only and does not enable delivery or change the recovery flow.
          </p>
        </section>

        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SettingsMetric label="Mode" tone="primary" value={modeLabels[recoveryView.mode]} />
          <SettingsMetric label="Environment" value={recoveryView.environment} />
          <SettingsMetric label="Schedule" value={recoveryView.scheduleLabel} />
          <SettingsMetric label="Sender" value={recoveryView.senderName} />
        </dl>

        <section className="rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] px-5 py-4 sm:px-6">
            <h2 className="text-base font-semibold tracking-[-0.02em]">How recovery works</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Three steps from failed-payment detection to customer follow-up.</p>
          </div>
          <ol className="grid gap-px bg-[var(--border)] md:grid-cols-3">
            {recoveryBenefits.map((benefit, index) => (
              <li className="flex gap-3 bg-[var(--surface)] p-5" key={benefit.title}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--primary-soft)] text-[var(--primary)]">
                  <Icon className="size-4" name={benefit.icon} />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">Step {index + 1}</p>
                  <h3 className="mt-1 text-sm font-semibold text-[var(--foreground)]">{benefit.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{benefit.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="review-message-heading">
          <div className="mb-4">
            <h2 className="text-lg font-semibold tracking-[-0.02em]" id="review-message-heading">Customer messages</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">Open each message to verify the exact saved copy customers would receive.</p>
          </div>
          <RecoveryMessageCards collapsible recoveryView={recoveryView} />
        </section>

        <section className="flex items-start gap-3 rounded-[var(--radius-dashboard-card)] border border-[var(--border-strong)] bg-[var(--warning-soft)] px-5 py-4 sm:px-6">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--warning-text)]">
            <Icon className="size-4" name="lock" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Review only—delivery does not change here</h2>
            <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">Any move toward live delivery still requires the separately reviewed safeguards shown in Safety &amp; audit.</p>
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link className="inline-flex h-10 items-center justify-center text-sm font-medium text-[var(--muted-strong)] hover:text-[var(--foreground)]" href="/dashboard/recovery?step=customize">Back to settings</Link>
          <Link className="inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] bg-[var(--primary)] px-5 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)]" href="/dashboard/recovery">Return to recovery</Link>
        </div>
      </div>
    </div>
  );
}
