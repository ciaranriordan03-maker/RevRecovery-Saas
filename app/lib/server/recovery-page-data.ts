import "server-only";

import type { RecoveryWorkspaceView } from "../../components/dashboard/recovery-workspace";
import { getAtRiskCustomers } from "./at-risk-customers";
import {
  getActivationReadinessForUser,
  getControlledTestEligibility,
} from "./activation-readiness";
import { getRecoveryModeSettingsForUser } from "./recovery-account-settings";
import { getUserSettings } from "./settings-store";
import { getStripeConnectionSummary } from "./stripe-connections";
import { buildRecoveryOpportunityReport } from "../recovery/opportunity-report";
import { buildRecoveryFlowView } from "../recovery/recovery-view";

export type RecoveryPageMode = "customize" | "review" | "sequence";

export function getRecoveryPageMode(step: string | undefined): RecoveryPageMode {
  if (step === "review" || step === "activate") return "review";
  if (step === "customize") return "customize";
  return "sequence";
}

export function getRecoveryWorkspaceView(
  value: string | undefined,
): RecoveryWorkspaceView {
  if (value === "flow") return "flow";

  return "overview";
}

export async function loadRecoveryPageData({
  mode,
  userId,
}: {
  mode: RecoveryPageMode;
  userId: string;
}) {
  const [
    settingsRecord,
    recoverySettings,
    atRiskCustomers,
    stripeConnection,
  ] = await Promise.all([
    getUserSettings(userId),
    getRecoveryModeSettingsForUser(userId),
    mode === "sequence" ? getAtRiskCustomers(userId) : Promise.resolve([]),
    getStripeConnectionSummary(userId),
  ]);
  const recoveryView = buildRecoveryFlowView(
    settingsRecord.settings,
    recoverySettings,
  );
  const activationReadiness = await getActivationReadinessForUser({
    recoverySettings,
    userId,
    userSettings: settingsRecord.settings,
  });
  const controlledTestEligibility = getControlledTestEligibility({
    recoverySettings,
    userSettings: settingsRecord.settings,
  });
  return {
    activationReadiness,
    atRiskCustomers,
    controlledTestEligibility,
    mode,
    opportunityReport: buildRecoveryOpportunityReport(stripeConnection),
    recoveryView,
    userSettings: settingsRecord.settings,
  };
}
