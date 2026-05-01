import type { Metadata } from "next";
import { AppShell } from "../../components/dashboard/app-shell";
import { InsightsContent } from "../../components/dashboard/insights-content";
import { requireCompletedOnboarding } from "../../lib/auth";

export const metadata: Metadata = {
  title: "Insights | RecoverFlow",
  description: "Performance breakdown and key learnings for recovery flows.",
};

export default async function InsightsPage() {
  await requireCompletedOnboarding();
  return (
    <AppShell
      active="Insights"
      subtitle="Performance breakdown and key learnings"
      title="Insights"
    >
      <InsightsContent />
    </AppShell>
  );
}
