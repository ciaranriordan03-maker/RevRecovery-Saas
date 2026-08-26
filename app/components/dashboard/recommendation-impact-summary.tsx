type RecommendationImpactSummaryProps = {
  caption?: string;
  value: string;
};

export function RecommendationImpactSummary({
  caption = "Calculated from your current failed-payment data",
  value,
}: RecommendationImpactSummaryProps) {
  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--primary-border)] bg-[var(--primary-soft)] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--foreground)]">
            Revenue Currently at Risk
          </p>
          <p className="mt-1 text-sm text-[var(--muted-strong)]">{caption}</p>
        </div>
        <div className="rounded-[10px] border border-[var(--success-badge)] bg-[var(--surface)] px-4 py-3 text-left sm:text-right">
          <p className="text-2xl font-medium leading-8 text-[var(--success)]">
            {value}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Open failed payments
          </p>
        </div>
      </div>
    </section>
  );
}
