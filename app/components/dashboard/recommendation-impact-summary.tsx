type RecommendationImpactSummaryProps = {
  caption?: string;
  value: string;
};

export function RecommendationImpactSummary({
  caption = "If you apply all AI optimization changes",
  value,
}: RecommendationImpactSummaryProps) {
  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--primary-border)] bg-[var(--primary-soft)] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--foreground)]">
            Potential Revenue Recovered
          </p>
          <p className="mt-1 text-sm text-[var(--muted-strong)]">{caption}</p>
        </div>
        <div className="rounded-[10px] border border-[var(--success-badge)] bg-[var(--surface)] px-4 py-3 text-left sm:text-right">
          <p className="text-2xl font-medium leading-8 text-[var(--success)]">
            {value}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Additional recovery potential
          </p>
        </div>
      </div>
    </section>
  );
}
