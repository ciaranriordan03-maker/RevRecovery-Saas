import type { Metadata } from "next";
import { AppShell } from "../../components/dashboard/app-shell";
import { InsightsContent } from "../../components/dashboard/insights-content";
import { requireCompletedOnboarding } from "../../lib/auth";
import { getInsightsMetrics } from "../../lib/server/insights-metrics";

export const metadata: Metadata = {
  title: "Insights | RecoverFlow",
  description: "Performance breakdown and key learnings for recovery flows.",
};

export default async function InsightsPage() {
  const { claims } = await requireCompletedOnboarding();
  const insightsMetrics = await getInsightsMetrics(claims.sub);

  return (
    <AppShell
      active="Insights"
      subtitle="Performance breakdown and key learnings"
      title="Insights"
    >
      <InsightsContent insights={insightsMetrics} />
    </AppShell>
  );
}
