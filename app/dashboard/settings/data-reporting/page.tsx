import type { Metadata } from "next";
import { AppShell } from "../../../components/dashboard/app-shell";
import { InsightsDataReporting } from "../../../components/dashboard/insights-data-reporting";
import { requireCompletedOnboarding } from "../../../lib/auth";
import { getRecoveryModeSettingsForUser } from "../../../lib/server/recovery-account-settings";
import { getInsightsMetrics, normalizeInsightsFilter } from "../../../lib/server/insights-metrics";

export const metadata: Metadata = {
  title: "Data & reporting | RevRecovery",
  description: "Advanced reporting evidence, exports, and local verification tools.",
};

type DataReportingPageProps = {
  searchParams?: Promise<{
    environment?: string | string[];
    period?: string | string[];
    segment?: string | string[];
  }>;
};

export default async function DataReportingPage({ searchParams }: DataReportingPageProps) {
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
  const insights = await getInsightsMetrics(claims.sub, filter);

  return (
    <AppShell
      active="Settings"
      showPageHeading={false}
      subtitle="Advanced reporting evidence and verification"
      title="Data & reporting"
    >
      <InsightsDataReporting filter={filter} metric={insights.measurementEvidence} />
    </AppShell>
  );
}
