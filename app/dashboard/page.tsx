import type { Metadata } from "next";
import { AppShell } from "../components/dashboard/app-shell";
import { DashboardContent } from "../components/dashboard/dashboard-content";
import { requireCompletedOnboarding } from "../lib/auth";
import { getDashboardMetrics } from "../lib/server/dashboard-metrics";
import { getRecoveryModeSettingsForUser } from "../lib/server/recovery-account-settings";
import {
  getRecoveryCasesPage,
  normalizeRecoveryCaseFilters,
} from "../lib/server/recovery-cases";

export const metadata: Metadata = {
  title: "Dashboard | RevRecovery",
  description: "Review failed payment recovery opportunities in RevRecovery.",
};

export default async function DashboardPage() {
  const { claims } = await requireCompletedOnboarding();
  const recoverySettings = await getRecoveryModeSettingsForUser(claims.sub);
  const environment = recoverySettings.livemode === null
    ? "all"
    : recoverySettings.livemode
      ? "live"
      : "test";
  const [dashboardMetrics, openCasesPage, attentionCasesPage] = await Promise.all([
    getDashboardMetrics(claims.sub, environment),
    getRecoveryCasesPage(
      claims.sub,
      normalizeRecoveryCaseFilters({ environment, status: "open" }),
    ),
    getRecoveryCasesPage(
      claims.sub,
      normalizeRecoveryCaseFilters({ environment, status: "attention" }),
    ),
  ]);
  const contextEnvironment = recoverySettings.connected
    ? recoverySettings.livemode
      ? "Live"
      : "Test"
    : "Not connected";

  return (
    <AppShell
      active="Dashboard"
      contextLabel={`Stripe · ${contextEnvironment}`}
      showPageHeading={false}
      subtitle="Your failed payments and next actions"
      title="Dashboard"
    >
      <DashboardContent
        attentionCases={attentionCasesPage.cases}
        attentionCount={attentionCasesPage.totalCount}
        metrics={dashboardMetrics}
        openCases={openCasesPage.cases}
        recoverySettings={recoverySettings}
      />
    </AppShell>
  );
}
