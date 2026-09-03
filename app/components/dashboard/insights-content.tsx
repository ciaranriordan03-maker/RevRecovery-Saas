import { Icon } from "../ui-icon";
import type {
  EmailRecoveryMetric,
  DeliveryHealthMetric,
  EmailEngagementMetric,
  InsightCardMetric,
  InsightFunnelMetric,
  InsightsMetrics,
  SequenceSummaryMetric,
} from "../../lib/server/insights-metrics";

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
            Recoveries Attributed by Email Step
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            For directional reporting, each recovery is attributed to the latest email sent before the payment recovered.
          </p>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-[10px] border border-[var(--border)]">
        <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_1fr] bg-[var(--surface-muted)] px-4 py-3 text-xs font-medium uppercase tracking-[0.04em] text-[var(--muted)]">
          <span>Email</span>
          <span>Sent</span>
          <span>Attributed</span>
          <span>Attributed rate</span>
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

export function InsightsContent({ insights }: { insights: InsightsMetrics }) {
  return (
    <div className="px-5 py-8 sm:px-8">
      <div className="mx-auto flex max-w-[1024px] flex-col gap-7">
        <SequenceSummaryCard metrics={insights.sequenceSummary} />

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
