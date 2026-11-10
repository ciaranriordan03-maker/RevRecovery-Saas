import { Icon } from "../ui-icon";
import { RecommendationCard } from "./recommendation-card";
import { RecommendationImpactSummary } from "./recommendation-impact-summary";
import type { OptimizeRecommendations } from "../../lib/server/optimize-recommendations";

export function OptimizeContent({
  optimizeRecommendations,
}: {
  optimizeRecommendations: OptimizeRecommendations;
}) {
  return (
    <div className="px-5 pb-8 sm:px-8 xl:px-20">
      <div className="mx-auto flex max-w-[1024px] flex-col gap-4">
        <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-[var(--primary-soft)] text-[var(--primary)]">
              <Icon name="sparkles" className="size-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold tracking-[-0.01em] text-[var(--foreground)]">
                  Recommended next steps
                </h2>
                <span className="rounded-[6px] border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 text-xs font-medium text-[var(--muted-strong)]">
                  {optimizeRecommendations.environmentLabel}
                </span>
              </div>
              <p className="mt-2 text-sm text-[var(--muted-strong)]">
                Review {optimizeRecommendations.intro.count} practical action{optimizeRecommendations.intro.count === 1 ? "" : "s"}.
                {" "}{optimizeRecommendations.intro.summary}
              </p>
            </div>
          </div>
        </section>

        <RecommendationImpactSummary
          caption={optimizeRecommendations.impactSummary.caption}
          value={optimizeRecommendations.impactSummary.value}
        />

        <section className="flex flex-col gap-4">
          {optimizeRecommendations.recommendations.map((item) => (
            <RecommendationCard
              actionHref={item.actionHref}
              actionLabel={item.actionLabel}
              body={item.body}
              impactBadgeClass={item.impactBadgeClass}
              impactLabel={item.impactLabel}
              key={item.title}
              titleBadgeClass={item.titleBadgeClass}
              title={item.title}
            />
          ))}
        </section>
      </div>
    </div>
  );
}
