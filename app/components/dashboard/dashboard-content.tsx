import Link from "next/link";
import { Icon } from "../ui-icon";
import { RecommendationCard } from "./recommendation-card";
import { RecommendationImpactSummary } from "./recommendation-impact-summary";
import { breakdown, metrics, recommendationImpactSummary, recommendations } from "../../lib/data";

export function DashboardContent() {
  return (
    <div className="px-5 py-8 sm:px-8 xl:px-20">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <section className="rounded-[var(--radius-card)] border border-[var(--primary-border)] bg-[var(--primary-soft)] p-6">
          <p className="text-sm leading-5 text-[var(--primary-text)]">
            <span className="font-medium">Great news!</span> We&apos;ve analyzed
            your payment data and identified opportunities to recover revenue.
          </p>
        </section>

        <div className="grid gap-6 md:grid-cols-3">
          {metrics.map(([label, value, caption, tone]) => (
            <article
              className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]"
              key={label}
            >
              <div className="mb-4 flex items-center gap-3">
                <div
                  className={`flex size-10 items-center justify-center rounded-[10px] ${
                    tone === "success"
                      ? "bg-[var(--success-soft)] text-[var(--success)]"
                      : "bg-[var(--danger-soft)] text-[var(--danger)]"
                  }`}
                >
                  <Icon name={tone === "success" ? "check" : "alert"} />
                </div>
                <p className="text-sm text-[var(--muted)]">{label}</p>
              </div>
              <p
                className={`text-[30px] leading-9 ${
                  tone === "success" ? "text-[var(--success)]" : "text-[var(--foreground)]"
                }`}
              >
                {value}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">{caption}</p>
            </article>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
            <h2 className="text-sm font-medium">Breakdown by Type</h2>
            <div className="mt-4 divide-y divide-[var(--surface-muted)]">
              {breakdown.map(([label, value, color]) => (
                <div className="flex items-center justify-between py-3" key={label}>
                  <div className="flex items-center gap-3">
                    <span className={`size-2 rounded-full ${color}`} />
                    <span className="text-sm text-[var(--muted-strong)]">{label}</span>
                  </div>
                  <span className="text-sm">{value}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-sm font-medium">Recovery flow ready</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  3 emails, proven to recover 71% of failed payments.
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
            <h2 className="text-base font-medium">AI Recommendations Ready</h2>
            <p className="mt-2 text-sm text-[var(--muted-strong)]">
              Based on your performance data, we&apos;ve identified 3 opportunities
              to increase recovery rates.
            </p>
          </div>
          <div className="mb-4">
            <RecommendationImpactSummary value={recommendationImpactSummary.value} />
          </div>
          <div className="grid gap-4">
            {recommendations.map((item) => (
              <RecommendationCard
                action={item.action}
                body={item.body}
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
