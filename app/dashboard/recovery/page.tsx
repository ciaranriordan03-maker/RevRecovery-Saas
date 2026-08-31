import type { Metadata } from "next";
import { AppShell } from "../../components/dashboard/app-shell";
import { RecoveryContent } from "../../components/dashboard/recovery-content";
import { requireCompletedOnboarding } from "../../lib/auth";
import { getAtRiskCustomers } from "../../lib/server/at-risk-customers";
import { getRecoveryModeSettingsForUser } from "../../lib/server/recovery-account-settings";
import { getUserSettings } from "../../lib/server/settings-store";
import { buildRecoveryFlowView } from "../../lib/recovery/recovery-view";

export const metadata: Metadata = {
  title: "Recovery Flow | RevRecovery",
  description: "Review the RevRecovery email recovery sequence.",
};

type RecoveryPageProps = {
  searchParams?: Promise<{
    step?: string;
  }>;
};

const pageCopy = {
  review: {
    subtitle: "Confirm how automated recovery operates",
    title: "Review Recovery Flow",
  },
  customize: {
    subtitle: "Review the settings currently used for recovery",
    title: "Recovery Settings",
  },
  sequence: {
    subtitle: "Automated email sequence for failed payments",
    title: "Recovery Flow",
  },
} as const;

export default async function RecoveryPage({ searchParams }: RecoveryPageProps) {
  const { claims } = await requireCompletedOnboarding();
  const params = await searchParams;
  const mode =
    params?.step === "review" || params?.step === "activate"
      ? "review"
      : params?.step === "customize"
        ? "customize"
        : "sequence";
  const [settingsRecord, recoverySettings, atRiskCustomers] = await Promise.all([
    getUserSettings(claims.sub),
    getRecoveryModeSettingsForUser(claims.sub),
    mode === "sequence" ? getAtRiskCustomers(claims.sub) : Promise.resolve([]),
  ]);
  const recoveryView = buildRecoveryFlowView(
    settingsRecord.settings,
    recoverySettings,
  );

  return (
    <AppShell
      active="Recovery"
      subtitle={pageCopy[mode].subtitle}
      title={pageCopy[mode].title}
    >
      <RecoveryContent
        atRiskCustomers={atRiskCustomers}
        mode={mode}
        recoveryView={recoveryView}
      />
    </AppShell>
  );
}
