import type { Metadata } from "next";
import { OptimizeContent } from "../../components/dashboard/optimize-content";
import { AppShell } from "../../components/dashboard/app-shell";
import { requireCompletedOnboarding } from "../../lib/auth";
import { getOptimizeRecommendations } from "../../lib/server/optimize-recommendations";

export const metadata: Metadata = {
  title: "Recommendations | RevRecovery",
  description: "Practical next actions based on your current recovery state.",
};

export default async function OptimizePage() {
  const { claims } = await requireCompletedOnboarding();
  const optimizeRecommendations = await getOptimizeRecommendations(claims.sub);

  return (
    <AppShell
      active="Optimize"
      subtitle="Practical next actions based on your current recovery state"
      title="Recommendations"
    >
      <OptimizeContent optimizeRecommendations={optimizeRecommendations} />
    </AppShell>
  );
}
