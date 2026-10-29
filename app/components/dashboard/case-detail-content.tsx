import { formatCurrencyAmounts } from "../../lib/currency";
import { buildRecoveryCaseTimelineView } from "../../lib/recovery/case-timeline-view";
import { buildFailureSpecificEmailPreview } from "../../lib/recovery/failure-specific-email-preview";
import { evaluateRetryEmailOverlap } from "../../lib/recovery/retry-email-overlap";
import type { RecoveryCaseTimelineEvent } from "../../lib/server/recovery-case-events";
import type { RecoveryCaseListItem } from "../../lib/server/recovery-cases";
import { Icon } from "../ui-icon";
import { CaseDetailDisclosure } from "./case-detail-disclosure";
import { CaseDetailFrame, CaseDetailHeader } from "./case-detail-frame";
import { CaseManualActions } from "./case-manual-actions";

const cardClass =
  "rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6";

function formatCurrency(amount: number, currency: string | null) {
  return formatCurrencyAmounts([{ amount, currency }]);
}

function formatDate(value: string | null) {
  if (!value) return "Not scheduled";

  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatLabel(value: string | null) {
  if (!value) return "Unknown";
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getCustomerLabel(recoveryCase: RecoveryCaseListItem) {
  return recoveryCase.customerEmail ?? recoveryCase.customerId ?? "Unknown customer";
}

function getEnvironmentLabel(livemode: boolean | null) {
  if (livemode === null) return "Stripe · Unknown";
  return livemode ? "Stripe · Live" : "Stripe · Test";
}

function getStatusLabel(status: string) {
  if (status === "failed_operationally") return "Operational failure";
  if (status === "exhausted") return "Sequence exhausted";
  return formatLabel(status);
}

function getStatusStyle(status: string) {
  if (status === "recovered") {
    return {
      background: "bg-[var(--success-soft)]",
      dot: "bg-[var(--success)]",
      text: "text-[var(--success)]",
    };
  }

  if (status === "failed_operationally") {
    return {
      background: "bg-[var(--danger-soft)]",
      dot: "bg-[var(--danger)]",
      text: "text-[var(--danger)]",
    };
  }

  if (status === "exhausted") {
    return {
      background: "bg-[var(--warning-soft)]",
      dot: "bg-[var(--warning-text)]",
      text: "text-[var(--warning-text)]",
    };
  }

  if (status === "detected") {
    return {
      background: "bg-[var(--surface-muted)]",
      dot: "bg-[var(--muted)]",
      text: "text-[var(--muted-strong)]",
    };
  }

  return {
    background: "bg-[var(--primary-soft)]",
    dot: "bg-[var(--primary)]",
    text: "text-[var(--primary)]",
  };
}

function StatusBadge({ status }: { status: string }) {
  const style = getStatusStyle(status);

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-[6px] px-2 py-1 text-[11px] font-semibold ${style.background} ${style.text}`}
    >
      <span aria-hidden className={`size-1 rounded-full ${style.dot}`} />
      {getStatusLabel(status)}
    </span>
  );
}

function ContextBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "warning";
}) {
  const className = tone === "warning"
    ? "bg-[var(--warning-soft)] text-[var(--warning-text)]"
    : "bg-[var(--surface-muted)] text-[var(--muted-strong)]";
  const dotClassName = tone === "warning"
    ? "bg-[var(--warning-text)]"
    : "bg-[var(--muted)]";

  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-[6px] px-2 py-1 text-[11px] font-semibold ${className}`}>
      <span aria-hidden className={`size-1 rounded-full ${dotClassName}`} />
      {label}
    </span>
  );
}

function OverviewItem({
  emphasize = false,
  label,
  value,
}: {
  emphasize?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs leading-5 text-[var(--muted)]">{label}</dt>
      <dd
        className={`mt-2 break-words font-semibold leading-5 ${
          emphasize
            ? "text-[28px] leading-9 tracking-[-0.03em] text-[var(--primary)]"
            : "text-sm text-[var(--foreground)]"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function Fact({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs leading-5 text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 break-words text-[13px] leading-5 text-[var(--foreground)]">{value}</dd>
    </div>
  );
}

function getRecoveryStageLabel(recoveryCase: RecoveryCaseListItem) {
  if (recoveryCase.manuallyPausedAt) return "Recovery emails manually paused";
  if (recoveryCase.caseStatus === "exhausted") return "Sequence exhausted";
  if (recoveryCase.scheduledMessageCount === 0) return "No recovery sequence scheduled";
  if (recoveryCase.remainingMessageCount > 0) {
    const stage = recoveryCase.caseStatus === "active"
      ? "Active"
      : formatLabel(recoveryCase.recoveryStage);
    return `${stage} with messages remaining`;
  }
  return formatLabel(recoveryCase.recoveryStage);
}

function AttentionPanel({ recoveryCase }: { recoveryCase: RecoveryCaseListItem }) {
  if (recoveryCase.attentionFlags.length === 0) return null;

  return (
    <section
      aria-labelledby="attention-heading"
      className={`${cardClass} border-l-4 ${
        recoveryCase.attentionLevel === "critical"
          ? "border-l-[var(--danger)]"
          : "border-l-[var(--warning-text)]"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="min-w-0 flex-1 text-base font-semibold text-[var(--foreground)]" id="attention-heading">
          Needs attention
        </h2>
        <ContextBadge
          label={recoveryCase.attentionLevel === "critical" ? "Critical" : "Review"}
          tone="warning"
        />
      </div>
      <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
        Explainable flags based only on the case and delivery facts recorded below.
      </p>
      <div className="mt-4 grid gap-3">
        {recoveryCase.attentionFlags.map((flag) => (
          <div
            className={`rounded-[var(--radius-control)] border p-4 ${
              flag.level === "critical"
                ? "border-[var(--danger)] bg-[var(--danger-soft)]"
                : "border-[var(--warning-text)] bg-[var(--warning-soft)]"
            }`}
            key={flag.code}
          >
            <p className="text-[13px] font-semibold text-[var(--foreground)]">{flag.title}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">{flag.explanation}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function GuidancePanel({ recoveryCase }: { recoveryCase: RecoveryCaseListItem }) {
  return (
    <section
      aria-labelledby="communication-guidance-heading"
      className={`${cardClass} order-1 lg:order-none`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2
          className="min-w-0 flex-1 text-base font-semibold text-[var(--foreground)]"
          id="communication-guidance-heading"
        >
          Recommended recovery action
        </h2>
        <ContextBadge label="Advisory" />
      </div>
      <p className="mt-3 text-[13px] leading-5 text-[var(--muted-strong)]">
        Communication guidance based on Stripe&apos;s reported failure reason.
      </p>
      <dl className="mt-5 grid gap-4 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        <div>
          <dt className="text-[13px] font-semibold text-[var(--foreground)]">What the customer should do</dt>
          <dd className="mt-1 text-[13px] leading-5 text-[var(--foreground)]">{recoveryCase.customerAction}</dd>
        </div>
        <div>
          <dt className="text-[13px] font-semibold text-[var(--foreground)]">What your team should do</dt>
          <dd className="mt-1 text-[13px] leading-5 text-[var(--foreground)]">{recoveryCase.merchantAction}</dd>
        </div>
        <div>
          <dt className="text-[13px] font-semibold text-[var(--foreground)]">How to describe the retry</dt>
          <dd className="mt-1 text-[13px] leading-5 text-[var(--foreground)]">{recoveryCase.retryGuidance}</dd>
        </div>
      </dl>
      <p className="mt-5 text-xs leading-5 text-[var(--muted)]">
        Advisory only. This guidance changes neither saved message copy, Stripe retry timing, nor automated delivery.
      </p>
    </section>
  );
}

function CoordinationPanel({
  recoveryCase,
}: {
  recoveryCase: RecoveryCaseListItem;
}) {
  const retryEmailOverlap = evaluateRetryEmailOverlap({
    nextEmailAt: recoveryCase.nextEmailAt,
    nextPaymentAttemptAt: recoveryCase.nextPaymentAttemptAt,
  });
  const hasRecoverySequence = recoveryCase.scheduledMessageCount > 0;
  const isRecoverySequenceExhausted = recoveryCase.caseStatus === "exhausted";
  const overlapClassName = retryEmailOverlap.status === "review"
    ? "border-[var(--warning-text)] bg-[var(--warning-soft)]"
    : retryEmailOverlap.status === "clear"
      ? "border-[var(--success)] bg-[var(--success-soft)]"
      : "border-[var(--border)] bg-[var(--surface-muted)]";

  return (
    <section
      aria-labelledby="retry-coordination-heading"
      className={`${cardClass} order-2 lg:order-none`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2
          className="min-w-0 flex-1 text-base font-semibold text-[var(--foreground)]"
          id="retry-coordination-heading"
        >
          Recovery coordination
        </h2>
        <ContextBadge label="Read only" />
      </div>
      <dl className="mt-5 grid gap-4">
        <Fact label="Next Stripe retry" value={formatDate(recoveryCase.nextPaymentAttemptAt)} />
        <Fact label="Next RevRecovery email" value={formatDate(recoveryCase.nextEmailAt)} />
        <Fact
          label="Recorded attempts"
          value={`${recoveryCase.attemptCount} recorded payment ${recoveryCase.attemptCount === 1 ? "attempt" : "attempts"}`}
        />
      </dl>
      <div className={`mt-5 rounded-[var(--radius-control)] border p-4 ${overlapClassName}`}>
        <p className="text-xs font-semibold text-[var(--foreground)]">{retryEmailOverlap.title}</p>
        <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">{retryEmailOverlap.detail}</p>
      </div>
      <div className="mt-5 border-t border-[var(--border)] pt-5">
        <p className="text-xs text-[var(--muted)]">Sequence</p>
        <p className="mt-1 text-[13px] font-semibold text-[var(--foreground)]">
          {hasRecoverySequence
            ? recoveryCase.remainingMessageCount > 0
              ? "Active with messages remaining"
              : "No messages remaining"
            : "No recovery sequence scheduled"}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-4">
          <Fact label="Scheduled" value={String(recoveryCase.scheduledMessageCount)} />
          <Fact label="Remaining" value={String(recoveryCase.remainingMessageCount)} />
        </dl>
        <dl className="mt-4 grid gap-4">
          <Fact label="Recovery window" value={formatDate(recoveryCase.recoveryWindowEndsAt)} />
          <Fact label="Sequence exhausted" value={isRecoverySequenceExhausted ? "Yes" : "No"} />
        </dl>
      </div>
      <p className="mt-5 text-xs leading-5 text-[var(--muted)]">
        This read-only view does not automatically change any schedules.{" "}
        {isRecoverySequenceExhausted
          ? "The case is marked exhausted after its recorded recovery sequence completed."
          : "The case is not marked exhausted."}
        {" "}RevRecovery has not changed this case&apos;s schedule or status.
      </p>
    </section>
  );
}

function EmailPreviewPanel({
  className,
  recoveryCase,
}: {
  className: string;
  recoveryCase: RecoveryCaseListItem;
}) {
  const emailPreview = buildFailureSpecificEmailPreview({
    category: recoveryCase.failureCategory,
    nextRetryLabel: recoveryCase.nextPaymentAttemptAt
      ? formatDate(recoveryCase.nextPaymentAttemptAt)
      : null,
  });

  return (
    <CaseDetailDisclosure
      badges={
        <div className="flex flex-wrap gap-2">
          <ContextBadge label="Preview only" />
          <ContextBadge label="Not saved" />
        </div>
      }
      className={className}
      collapsedLabel="Show email preview"
      expandedLabel="Hide email preview"
      footer={
        <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
          This preview does not modify the account template, this case&apos;s sequence, or email delivery.
        </p>
      }
      title="Suggested first email"
    >
      <div className="mt-4 border-t border-[var(--border)] pt-5 lg:mt-5">
        <p className="text-[13px] leading-5 text-[var(--muted-strong)]">
          Suggested first-email treatment for this failure category. Review it before deciding whether it should influence automated messages.
        </p>
        <div className="mt-4 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-muted)] p-4 sm:p-5">
          <p className="text-xs text-[var(--muted)]">Suggested subject</p>
          <p className="mt-1 text-[13px] font-semibold text-[var(--foreground)]">{emailPreview.subject}</p>
          <div className="mt-4 space-y-3 text-[13px] leading-6 text-[var(--muted-strong)]">
            <p>Hi [customer first name],</p>
            <p>{emailPreview.contextLine}</p>
            <p>{emailPreview.actionLine}</p>
            <p>{emailPreview.retryLine}</p>
            <p>[Secure Stripe invoice link]</p>
          </div>
        </div>
        <div className="mt-4 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
          <p className="text-xs font-semibold text-[var(--foreground)]">Why this treatment</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">{emailPreview.rationale}</p>
        </div>
      </div>
    </CaseDetailDisclosure>
  );
}

function CaseFactsPanel({
  className,
  recoveryCase,
}: {
  className: string;
  recoveryCase: RecoveryCaseListItem;
}) {
  return (
    <CaseDetailDisclosure
      className={className}
      collapsedLabel="Show case facts"
      expandedLabel="Hide case facts"
      title="Case facts"
    >
      <dl className="mt-4 grid gap-4 border-t border-[var(--border)] pt-5 sm:grid-cols-2 lg:grid-cols-1">
        <Fact label="Audience" value={formatLabel(recoveryCase.audienceSegment)} />
        <Fact label="Stripe invoice status" value={formatLabel(recoveryCase.invoiceStatus)} />
        <Fact
          label="Environment"
          value={recoveryCase.livemode === null ? "Unknown" : recoveryCase.livemode ? "Live" : "Test"}
        />
        <Fact label="Case opened" value={formatDate(recoveryCase.createdAt)} />
        <Fact label="Last updated" value={formatDate(recoveryCase.updatedAt)} />
        <Fact
          label="Recovered"
          value={recoveryCase.recoveredAt ? formatDate(recoveryCase.recoveredAt) : "Not yet recovered"}
        />
      </dl>
    </CaseDetailDisclosure>
  );
}

function getTimelineToneClass(tone: "danger" | "neutral" | "success" | "warning") {
  if (tone === "success") return "bg-[var(--success-soft)] text-[var(--success)]";
  if (tone === "warning") return "bg-[var(--warning-soft)] text-[var(--warning-text)]";
  if (tone === "danger") return "bg-[var(--danger-soft)] text-[var(--danger)]";
  return "bg-[var(--surface-muted)] text-[var(--muted)]";
}

function getTimelineIcon(tone: "danger" | "neutral" | "success" | "warning") {
  if (tone === "success") return "check-circle";
  if (tone === "danger" || tone === "warning") return "alert";
  return "clock";
}

function TimelinePanel({ timeline }: { timeline: RecoveryCaseTimelineEvent[] }) {
  return (
    <section className={cardClass} aria-labelledby="recovery-timeline-heading">
      <h2 className="text-base font-semibold text-[var(--foreground)]" id="recovery-timeline-heading">
        Recovery timeline
      </h2>
      {timeline.length === 0 ? (
        <div className="mt-5 rounded-[var(--radius-control)] border border-dashed border-[var(--border-strong)] p-6">
          <p className="text-[13px] font-semibold text-[var(--foreground)]">No timeline activity recorded</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            No historical timeline events are available for this case. Older cases may predate event tracking.
          </p>
        </div>
      ) : (
        <ol className="mt-2 divide-y divide-[var(--border)]">
          {timeline.map((event) => {
            const view = buildRecoveryCaseTimelineView(event);
            const synthetic = event.sourceEventId?.startsWith("rr_test_evt_") ?? false;

            return (
              <li className="flex gap-4 py-4 first:pt-5 last:pb-0" key={view.id}>
                <span
                  aria-hidden
                  className={`flex size-7 shrink-0 items-center justify-center rounded-[8px] ${getTimelineToneClass(view.tone)}`}
                >
                  <Icon className="size-4" name={getTimelineIcon(view.tone)} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <h3 className="text-[13px] font-semibold leading-5 text-[var(--foreground)]">{view.title}</h3>
                    <time className="shrink-0 text-xs text-[var(--muted)]" dateTime={view.occurredAt}>
                      {formatDate(view.occurredAt)}
                    </time>
                  </div>
                  {synthetic ? <div className="mt-2"><ContextBadge label="Test evidence" /></div> : null}
                  <p className="mt-2 text-[13px] leading-5 text-[var(--foreground)]">{view.detail}</p>
                  <p className="mt-2 text-xs text-[var(--muted)]">Source: {view.sourceLabel}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export function CaseDetailContent({
  recoveryCase,
  timeline,
}: {
  recoveryCase: RecoveryCaseListItem;
  timeline: RecoveryCaseTimelineEvent[];
}) {
  const canControlEmails = ![
    "canceled_by_merchant",
    "exhausted",
    "no_longer_applicable",
    "recovered",
  ].includes(recoveryCase.caseStatus) && recoveryCase.caseStatus !== "detected";
  const emailStageDetail = recoveryCase.manuallyPausedAt
    ? "Recovery emails manually paused"
    : recoveryCase.nextEmailAt === null && recoveryCase.caseStatus === "detected"
      ? "No recovery email has been scheduled"
      : `Current stage: ${formatLabel(recoveryCase.recoveryStage)}`;
  const hasSyntheticTestEvidence = timeline.some(
    (event) => event.sourceEventId?.startsWith("rr_test_evt_") ?? false,
  );

  return (
    <CaseDetailFrame>
      <CaseDetailHeader>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={recoveryCase.caseStatus} />
          <ContextBadge label={getEnvironmentLabel(recoveryCase.livemode)} />
          {recoveryCase.attentionFlags.length > 0 ? (
            <ContextBadge label="Attention required" tone="warning" />
          ) : null}
        </div>
        <div className="min-w-0">
          <p className="break-words text-lg font-semibold leading-6 text-[var(--foreground)]">
            {getCustomerLabel(recoveryCase)}
          </p>
          <p className="mt-2 break-all text-xs leading-5 text-[var(--muted)]">{recoveryCase.invoiceId}</p>
        </div>
      </CaseDetailHeader>

      <section className={cardClass} aria-label="Case overview">
        <dl className="grid grid-cols-2 gap-x-5 gap-y-6 lg:grid-cols-4">
          <OverviewItem
            emphasize
            label="Amount at risk"
            value={formatCurrency(recoveryCase.amountDue, recoveryCase.currency)}
          />
          <OverviewItem label="Failure reported" value={recoveryCase.failureTitle} />
          <OverviewItem
            label="Recorded attempts"
            value={`${recoveryCase.attemptCount} recorded payment ${recoveryCase.attemptCount === 1 ? "attempt" : "attempts"}`}
          />
          <OverviewItem label="Recovery stage" value={getRecoveryStageLabel(recoveryCase)} />
        </dl>
        <div className="mt-5 border-t border-[var(--border)] pt-4">
          <p className="text-[13px] leading-5 text-[var(--foreground)]">{recoveryCase.failureExplanation}</p>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{emailStageDetail}</p>
          {hasSyntheticTestEvidence ? (
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
              Recorded sandbox evidence; no Stripe payment was attempted.
            </p>
          ) : null}
        </div>
      </section>

      <AttentionPanel recoveryCase={recoveryCase} />

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:items-start">
        <div className="contents lg:col-span-8 lg:flex lg:flex-col lg:gap-6">
          <GuidancePanel recoveryCase={recoveryCase} />
          <EmailPreviewPanel
            className="order-4 lg:order-none"
            recoveryCase={recoveryCase}
          />
        </div>
        <aside className="contents lg:col-span-4 lg:flex lg:flex-col lg:gap-6">
          <CoordinationPanel recoveryCase={recoveryCase} />
          {canControlEmails ? (
            <CaseManualActions
              className="order-3 lg:order-none"
              failedPaymentId={recoveryCase.id}
              manuallyPausedAt={recoveryCase.manuallyPausedAt}
            />
          ) : null}
          <CaseFactsPanel
            className="order-5 lg:order-none"
            recoveryCase={recoveryCase}
          />
        </aside>
      </div>

      <TimelinePanel timeline={timeline} />
    </CaseDetailFrame>
  );
}
