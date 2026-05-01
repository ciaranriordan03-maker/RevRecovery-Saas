import type { Metadata } from "next";
import { OptimizeContent } from "../../components/dashboard/optimize-content";
import { AppShell } from "../../components/dashboard/app-shell";
import { requireCompletedOnboarding } from "../../lib/auth";

export const metadata: Metadata = {
  title: "Optimization | RecoverFlow",
  description: "AI-powered suggestions to improve recovery.",
};

export default async function OptimizePage() {
  await requireCompletedOnboarding();
  return (
    <AppShell
      active="Optimize"
      subtitle="AI-powered suggestions to improve recovery"
      title="Optimization"
    >
      <OptimizeContent />
    </AppShell>
  );
}
