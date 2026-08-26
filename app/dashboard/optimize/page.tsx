import type { Metadata } from "next";
import { OptimizeContent } from "../../components/dashboard/optimize-content";
import { AppShell } from "../../components/dashboard/app-shell";
import { requireCompletedOnboarding } from "../../lib/auth";
import { getOptimizeRecommendations } from "../../lib/server/optimize-recommendations";

export const metadata: Metadata = {
  title: "Optimization | RevRecovery",
  description: "Data-informed suggestions to improve recovery workflows.",
};

export default async function OptimizePage() {
  const { claims } = await requireCompletedOnboarding();
  const optimizeRecommendations = await getOptimizeRecommendations(claims.sub);

  return (
    <AppShell
      active="Optimize"
      subtitle="Data-informed suggestions to improve recovery workflows"
      title="Optimization"
    >
      <OptimizeContent optimizeRecommendations={optimizeRecommendations} />
    </AppShell>
  );
}
