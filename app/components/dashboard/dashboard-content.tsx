import Link from "next/link";
import { Icon } from "../ui-icon";
import { RecommendationCard } from "./recommendation-card";
import { RecommendationImpactSummary } from "./recommendation-impact-summary";
import type { DashboardMetricCard } from "../../lib/server/dashboard-metrics";
import type { OptimizeRecommendations } from "../../lib/server/optimize-recommendations";
import type { RecoveryStatusSummary } from "../../lib/recovery/recovery-view";

export function DashboardContent({
  metrics,
  optimizeRecommendations,
  recoverySummary,
}: {
  metrics: DashboardMetricCard[];
  optimizeRecommendations: OptimizeRecommendations;
  recoverySummary: RecoveryStatusSummary;
}) {
  return (
    <div className="px-5 py-8 sm:px-8 xl:px-20">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <section className="rounded-[var(--radius-card)] border border-[var(--primary-border)] bg-[var(--primary-soft)] p-6">
          <p className="text-sm leading-5 text-[var(--primary-text)]">
            <span className="font-medium">Account overview:</span> These metrics
            are calculated from your connected payment and recovery data.
          </p>
        </section>

        <div className="grid gap-6 md:grid-cols-3">
          {metrics.map((metric) => (
            <article
              className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]"
              key={metric.label}
            >
              <div className="mb-4 flex items-center gap-3">
                <div
                  className={`flex size-10 items-center justify-center rounded-[10px] ${
                    metric.tone === "success"
                      ? "bg-[var(--success-soft)] text-[var(--success)]"
                      : "bg-[var(--danger-soft)] text-[var(--danger)]"
                  }`}
                >
                  <Icon name={metric.tone === "success" ? "check" : "alert"} />
                </div>
                <p className="text-sm text-[var(--muted)]">{metric.label}</p>
              </div>
              <p
                className={`text-[30px] leading-9 ${
                  metric.tone === "success" ? "text-[var(--success)]" : "text-[var(--foreground)]"
                }`}
              >
                {metric.value}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">{metric.caption}</p>
            </article>
          ))}
        </div>

        <div>
          <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-sm font-medium">{recoverySummary.title}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {recoverySummary.description}
                </p>
              </div>
              <Link
                className="inline-flex h-10 items-center justify-center rounded-[10px] bg-[var(--primary)] px-5 text-sm font-medium text-white hover:bg-[var(--primary-hover)]"
                href="/dashboard/recovery"
              >
                View flow
              </Link>
            </div>
          </section>
        </div>

        <section>
          <div className="mb-4 rounded-[var(--radius-card)] border border-[var(--primary-border)] bg-gradient-to-br from-[var(--primary-soft)] to-[var(--purple-soft)] p-6">
            <h2 className="text-base font-medium">Recovery guidance</h2>
            <p className="mt-2 text-sm text-[var(--muted-strong)]">
              Review {optimizeRecommendations.intro.count} practical action{optimizeRecommendations.intro.count === 1 ? "" : "s"}
              alongside your account&apos;s recovery results.
            </p>
          </div>
          <div className="mb-4">
            <RecommendationImpactSummary
              caption={optimizeRecommendations.impactSummary.caption}
              value={optimizeRecommendations.impactSummary.value}
            />
          </div>
          <div className="grid gap-4">
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
          </div>
        </section>
      </div>
    </div>
  );
}
