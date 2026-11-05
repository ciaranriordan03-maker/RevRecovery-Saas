import "server-only";

import type { RecoveryWorkspaceView } from "../../components/dashboard/recovery-workspace";
import { getAtRiskCustomers } from "./at-risk-customers";
import {
  getActivationReadinessForUser,
  getControlledTestEligibility,
} from "./activation-readiness";
import { getNotificationActivationReviewForUser } from "./notification-activation-review";
import { getRecoveryModeSettingsForUser } from "./recovery-account-settings";
import { getPreviewRecoveryNotificationHistory } from "./recovery-notification-events";
import { getUserSettings } from "./settings-store";
import { getStripeConnectionSummary } from "./stripe-connections";
import { unavailableNotificationActivationReview } from "../recovery/notification-activation-review";
import { evaluateNotificationActivationReadiness } from "../recovery/notification-activation-readiness";
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
  if (value === "flow" || value === "notifications" || value === "safety") {
    return value;
  }

  return "overview";
}

export async function loadRecoveryPageData({
  accountEmail,
  mode,
  userId,
}: {
  accountEmail: string;
  mode: RecoveryPageMode;
  userId: string;
}) {
  const [
    settingsRecord,
    recoverySettings,
    atRiskCustomers,
    stripeConnection,
    notificationHistory,
    notificationActivationReview,
  ] = await Promise.all([
    getUserSettings(userId),
    getRecoveryModeSettingsForUser(userId),
    mode === "sequence" ? getAtRiskCustomers(userId) : Promise.resolve([]),
    getStripeConnectionSummary(userId),
    mode === "sequence"
      ? getPreviewRecoveryNotificationHistory(userId)
      : Promise.resolve({ deliveries: [], events: [], state: "ready" as const }),
    mode === "sequence"
      ? getNotificationActivationReviewForUser(userId)
      : Promise.resolve(unavailableNotificationActivationReview()),
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
  const notificationReadiness = evaluateNotificationActivationReadiness({
    accountEmail,
    activationReadiness,
    notificationHistory,
  });

  return {
    accountEmail,
    activationReadiness,
    atRiskCustomers,
    controlledTestEligibility,
    mode,
    notificationActivationReview,
    notificationHistory,
    notificationReadiness,
    opportunityReport: buildRecoveryOpportunityReport(stripeConnection),
    recoveryView,
    userSettings: settingsRecord.settings,
  };
}
