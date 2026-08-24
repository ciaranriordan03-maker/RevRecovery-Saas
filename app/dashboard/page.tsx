import type { Metadata } from "next";
import { AppShell } from "../components/dashboard/app-shell";
import { DashboardContent } from "../components/dashboard/dashboard-content";
import { requireCompletedOnboarding } from "../lib/auth";
import { getDashboardMetrics } from "../lib/server/dashboard-metrics";
import { getOptimizeRecommendations } from "../lib/server/optimize-recommendations";

export const metadata: Metadata = {
  title: "Dashboard | RevRecovery",
  description: "Review failed payment recovery opportunities in RevRecovery.",
};

export default async function DashboardPage() {
  const { claims } = await requireCompletedOnboarding();
  const [dashboardMetrics, optimizeRecommendations] = await Promise.all([
    getDashboardMetrics(claims.sub),
    getOptimizeRecommendations(claims.sub),
  ]);

  return (
    <AppShell
      active="Dashboard"
      subtitle="Here's what we found in your Stripe account"
      title="Instant Insights"
    >
      <DashboardContent
        metrics={dashboardMetrics.metricCards}
        optimizeRecommendations={optimizeRecommendations}
      />
    </AppShell>
  );
}
