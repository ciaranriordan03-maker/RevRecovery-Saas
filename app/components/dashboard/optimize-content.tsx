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
        <section className="rounded-[var(--radius-card)] border border-[var(--primary-border)] bg-gradient-to-br from-[var(--primary-soft)] to-[var(--purple-soft)] px-6 py-[25px]">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-[var(--primary)] text-white">
              <Icon name="sparkles" className="size-6" />
            </div>
            <div>
              <h2 className="text-base font-medium tracking-[-0.02em] text-[var(--foreground)]">
                AI Recommendations Ready
              </h2>
              <p className="mt-2 text-sm text-[var(--muted-strong)]">
                Based on your performance data, we&apos;ve identified{" "}
                {optimizeRecommendations.intro.count} opportunities to increase
                recovery rates. {optimizeRecommendations.intro.summary}
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
              action={item.action}
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
