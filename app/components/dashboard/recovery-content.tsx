import Link from "next/link";
import { Icon } from "../ui-icon";
import { AtRiskCustomersTable } from "./at-risk-customers-table";
import { RecoverySettingsForm } from "./recovery-settings-form";
import { recoveryBenefits } from "../../lib/data";
import type { RecoveryFlowView } from "../../lib/recovery/recovery-view";
import type { AtRiskCustomer } from "../../lib/server/at-risk-customers";
import type { UserSettings } from "../../lib/settings";

type RecoveryContentProps = {
  atRiskCustomers?: AtRiskCustomer[];
  mode?: "sequence" | "customize" | "review";
  recoveryView: RecoveryFlowView;
  userSettings: UserSettings;
};

const modeLabels = { live: "Live", off: "Off", paused: "Paused", test: "Test" } as const;

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] p-4">
      <dt className="text-xs text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-[var(--foreground)]">{value}</dd>
    </div>
  );
}

function MessageCards({ recoveryView }: { recoveryView: RecoveryFlowView }) {
  return (
    <section className="flex flex-col gap-4">
      {recoveryView.messages.map((message, index) => (
        <article className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]" key={message.messageKey}>
          <div className="flex gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-[10px] bg-[var(--primary-soft)] text-[var(--primary)]">
              <Icon name={index === 0 ? "refresh" : index === 1 ? "clock" : "check-circle"} className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-base font-medium tracking-[-0.02em]">Email {index + 1}</h2>
                <span className="rounded bg-[var(--primary-soft)] px-2 py-1 text-xs text-[var(--primary)]">{message.timing}</span>
              </div>
              <p className="mt-2 text-sm leading-5 text-[var(--muted-strong)]">{message.bodyPreview}</p>
              <div className="mt-4 rounded-[10px] border border-[var(--border)] bg-[var(--background)] p-4">
                <p className="text-xs text-[var(--muted)]">Subject line:</p>
                <p className="mt-1 text-sm text-[var(--foreground)]">{message.subject}</p>
              </div>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

function RecoverySequence({ atRiskCustomers, recoveryView }: { atRiskCustomers: AtRiskCustomer[]; recoveryView: RecoveryFlowView }) {
  return (
    <div className="px-5 py-8 sm:px-8 xl:px-[143px]">
      <div className="mx-auto flex max-w-[896px] flex-col gap-8">
        <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
          <p className="text-sm leading-5 text-[var(--muted-strong)]">
            This account is in <strong>{modeLabels[recoveryView.mode]} mode</strong> and uses the {recoveryView.scheduleLabel.toLowerCase()} in {recoveryView.timezone}. The messages below are the templates currently used by the delivery worker.
          </p>
        </section>
        <MessageCards recoveryView={recoveryView} />
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Link className="inline-flex h-[50px] items-center justify-center rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--surface)] px-6 text-base font-medium text-[var(--text-subtle)] transition hover:bg-[var(--background)]" href="/dashboard/recovery?step=customize">View settings</Link>
          <Link className="inline-flex h-[50px] items-center justify-center rounded-[var(--radius-control)] bg-[var(--primary)] px-6 text-base font-medium text-white transition hover:bg-[var(--primary-hover)]" href="/dashboard/recovery?step=review">Review flow</Link>
        </div>
        <AtRiskCustomersTable customers={atRiskCustomers} />
      </div>
    </div>
  );
}

function CustomizeRecoveryStep({ recoveryView, userSettings }: { recoveryView: RecoveryFlowView; userSettings: UserSettings }) {
  const recipient = recoveryView.approvedTestRecipient ?? "Not configured";
  return (
    <div className="px-5 py-7 sm:px-8 xl:px-[143px]">
      <div className="mx-auto flex max-w-[896px] flex-col gap-7">
        <section className="rounded-[var(--radius-card)] border border-[var(--primary-border)] bg-[var(--primary-soft)] p-6">
          <h2 className="text-sm font-medium text-[var(--foreground)]">Saved recovery configuration</h2>
          <p className="mt-2 text-sm leading-5 text-[var(--muted-strong)]">The editable controls below save directly to the settings used by the recovery pipeline. Audience segmentation and individual message editing are not available yet.</p>
        </section>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Recovery mode" value={modeLabels[recoveryView.mode]} />
          <Detail label="Stripe environment" value={recoveryView.environment} />
          <Detail label="Schedule" value={recoveryView.scheduleLabel} />
          <Detail label="Timezone" value={recoveryView.timezone} />
          <Detail label="Email tone" value={recoveryView.tone} />
          <Detail label="Audience" value={recoveryView.audience} />
          <Detail label="Approved test recipient" value={recipient} />
          <Detail label="Sender name" value={recoveryView.senderName} />
          <Detail label="Reply-to email" value={recoveryView.replyToEmail} />
          <Detail label="Support email" value={recoveryView.supportEmail} />
        </dl>
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
        <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
          <h2 className="text-base font-medium text-[var(--foreground)]">Message templates</h2>
          <p className="mt-2 text-sm leading-5 text-[var(--muted-strong)]">These are the messages currently sent by the delivery worker. Template editing is planned for a later phase.</p>
        </section>
        <MessageCards recoveryView={recoveryView} />
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Link className="inline-flex h-[50px] items-center text-base font-medium text-[var(--muted-strong)] hover:text-[var(--foreground)]" href="/dashboard/recovery">Back to flow</Link>
          <Link className="inline-flex h-[50px] items-center justify-center rounded-[var(--radius-control)] bg-[var(--primary)] px-6 text-base font-medium text-white transition hover:bg-[var(--primary-hover)]" href="/dashboard/recovery?step=review">Review flow</Link>
        </div>
      </div>
    </div>
  );
}

function ReviewRecoveryStep({ recoveryView }: { recoveryView: RecoveryFlowView }) {
  return (
    <div className="px-5 py-8 sm:px-8 xl:px-[155px]">
      <div className="mx-auto flex max-w-[816px] flex-col gap-7">
        <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
          <h2 className="text-sm font-medium text-[var(--foreground)]">How your recovery flow works</h2>
          <div className="mt-5 flex flex-col gap-4">
            {recoveryBenefits.map((benefit) => (
              <div className="flex gap-4" key={benefit.title}>
                <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--primary-soft)] text-[var(--primary)]"><Icon name={benefit.icon} /></div>
                <div><h3 className="text-sm font-medium text-[var(--foreground)]">{benefit.title}</h3><p className="mt-1 text-xs leading-4 text-[var(--muted)]">{benefit.body}</p></div>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-[var(--radius-card)] border border-[var(--primary-border)] bg-[var(--primary-soft)] p-6">
          <h2 className="text-sm font-medium text-[var(--foreground)]">Current flow summary</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Detail label="Mode" value={modeLabels[recoveryView.mode]} />
            <Detail label="Environment" value={recoveryView.environment} />
            <Detail label="Schedule" value={recoveryView.scheduleLabel} />
            <Detail label="Timezone" value={recoveryView.timezone} />
            <Detail label="Email tone" value={recoveryView.tone} />
            <Detail label="Sender" value={recoveryView.senderName} />
          </dl>
        </section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link className="inline-flex h-[50px] items-center text-base font-medium text-[var(--muted-strong)] hover:text-[var(--foreground)]" href="/dashboard/recovery?step=customize">Back to settings</Link>
          <Link className="inline-flex h-[50px] items-center justify-center rounded-[var(--radius-control)] bg-[var(--primary)] px-6 text-base font-medium text-white transition hover:bg-[var(--primary-hover)]" href="/dashboard/recovery">Back to recovery</Link>
        </div>
      </div>
    </div>
  );
}

export function RecoveryContent({ atRiskCustomers = [], mode = "sequence", recoveryView, userSettings }: RecoveryContentProps) {
  if (mode === "review") return <ReviewRecoveryStep recoveryView={recoveryView} />;
  if (mode === "customize") return <CustomizeRecoveryStep recoveryView={recoveryView} userSettings={userSettings} />;
  return <RecoverySequence atRiskCustomers={atRiskCustomers} recoveryView={recoveryView} />;
}
