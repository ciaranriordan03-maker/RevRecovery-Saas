import type { Metadata } from "next";
import { OptimizeContent } from "../../components/dashboard/optimize-content";
import { AppShell } from "../../components/dashboard/app-shell";
import { requireCompletedOnboarding } from "../../lib/auth";
import { getOptimizeRecommendations } from "../../lib/server/optimize-recommendations";

export const metadata: Metadata = {
  title: "Optimization | RecoverFlow",
  description: "AI-powered suggestions to improve recovery.",
};

export default async function OptimizePage() {
  const { claims } = await requireCompletedOnboarding();
  const optimizeRecommendations = await getOptimizeRecommendations(claims.sub);

  return (
    <AppShell
      active="Optimize"
      subtitle="AI-powered suggestions to improve recovery"
      title="Optimization"
    >
      <OptimizeContent optimizeRecommendations={optimizeRecommendations} />
    </AppShell>
  );
}
