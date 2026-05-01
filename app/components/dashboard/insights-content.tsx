import { Icon } from "../ui-icon";
import { insightCards, insightFunnel } from "../../lib/data";

type InsightCardProps = {
  icon: string;
  iconClass: string;
  rows: readonly {
    label: string;
    rowClass: string;
    value: string;
    valueClass: string;
  }[];
  title: string;
};

function RecoveryFunnelCard() {
  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
      <h2 className="text-sm font-medium text-[var(--foreground)]">
        Recovery Funnel
      </h2>
      <div className="mt-6 flex flex-col gap-5">
        {insightFunnel.map((item) => (
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
}: InsightCardProps) {
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

export function InsightsContent() {
  return (
    <div className="px-5 py-8 sm:px-8">
      <div className="mx-auto flex max-w-[1024px] flex-col gap-7">
        <RecoveryFunnelCard />

        <div className="grid gap-5 xl:grid-cols-2">
          {insightCards.map((card) => (
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
