import type { Metadata } from "next";
import { AppShell } from "../../components/dashboard/app-shell";
import { InsightsContent } from "../../components/dashboard/insights-content";
import { requireCompletedOnboarding } from "../../lib/auth";
import { getRecoveryModeSettingsForUser } from "../../lib/server/recovery-account-settings";
import { getInsightsMetrics, normalizeInsightsFilter } from "../../lib/server/insights-metrics";

export const metadata: Metadata = {
  title: "Insights | RevRecovery",
  description: "Performance breakdown and key learnings for recovery flows.",
};

export default async function InsightsPage({ searchParams }: PageProps<"/dashboard/insights">) {
  const { claims } = await requireCompletedOnboarding();
  const [params, recoverySettings] = await Promise.all([
    searchParams,
    getRecoveryModeSettingsForUser(claims.sub),
  ]);
  const defaultEnvironment = recoverySettings.livemode === true
    ? "live"
    : recoverySettings.livemode === false
      ? "test"
      : "unconfirmed";
  const filter = normalizeInsightsFilter(params, defaultEnvironment);
  const insightsMetrics = await getInsightsMetrics(claims.sub, filter);

  return (
    <AppShell
      active="Insights"
      subtitle="Performance breakdown and key learnings"
      title="Insights"
    >
      <InsightsContent filter={filter} insights={insightsMetrics} />
    </AppShell>
  );
}
