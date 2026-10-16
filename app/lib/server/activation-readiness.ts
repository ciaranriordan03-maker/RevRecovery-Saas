import "server-only";

import {
  evaluateActivationReadiness,
  type ActivationReadiness,
  type ActivationReadinessInput,
} from "../recovery/activation-readiness";
import type { RecoveryModeSettings } from "./recovery-account-settings";
import { getSendingDomainForUser } from "./recovery-sending-domains";
import { createSupabaseAdminClient } from "../supabase/admin";
import { getUserSettingsValidationError, type UserSettings } from "../settings";
import {
  evaluateControlledTestEligibility,
  type ControlledTestEligibility,
} from "../recovery/controlled-test-plan";

type WebhookHealth = ActivationReadinessInput["webhookHealth"];

type LatestWebhookRow = {
  created_at: string;
  status: string;
};

const HEALTHY_WEBHOOK_WINDOW_DAYS = 7;

export function classifyWebhookHealth(
  row: LatestWebhookRow | null,
  now = new Date(),
): WebhookHealth {
  if (!row) return "unknown";
  if (row.status === "failed") return "failing";

  const createdAt = new Date(row.created_at);
  if (Number.isNaN(createdAt.getTime())) return "unknown";

  const age = now.getTime() - createdAt.getTime();
  if (age > HEALTHY_WEBHOOK_WINDOW_DAYS * 24 * 60 * 60 * 1000) {
    return "stale";
  }

  return ["processed", "ignored"].includes(row.status) ? "healthy" : "unknown";
}

async function getWebhookHealth(userId: string): Promise<WebhookHealth> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return "unknown";

  const { data, error } = await supabase
    .from("stripe_webhook_events")
    .select("status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<LatestWebhookRow>();

  if (error) return "unknown";
  return classifyWebhookHealth(data);
}

async function hasControlledTestEvidence(userId: string) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("failed_payments")
    .select("id")
    .eq("user_id", userId)
    .eq("livemode", false)
    .limit(1);

  return !error && Boolean(data?.length);
}

export async function getActivationReadinessForUser({
  recoverySettings,
  userId,
  userSettings,
}: {
  recoverySettings: RecoveryModeSettings;
  userId: string;
  userSettings: UserSettings;
}): Promise<ActivationReadiness> {
  const [sendingDomainResult, webhookHealth, controlledTestCompleted] =
    await Promise.all([
      getSendingDomainForUser(userId).catch(() => null),
      getWebhookHealth(userId),
      hasControlledTestEvidence(userId),
    ]);

  return evaluateActivationReadiness({
    approvedTestRecipient: recoverySettings.approvedTestRecipient,
    controlledTestCompleted,
    emailIdentityConfigured:
      getUserSettingsValidationError(userSettings) === null,
    mode: recoverySettings.mode,
    recoveryConfigurationPersisted:
      recoverySettings.connected && recoverySettings.source === "persisted",
    sendingDomainStatus: sendingDomainResult?.status ?? "not_configured",
    stripeCommunicationOverlapReviewed: false,
    stripeConnected: recoverySettings.connected,
    webhookHealth,
  });
}

export function getControlledTestEligibility({
  recoverySettings,
  userSettings,
}: {
  recoverySettings: RecoveryModeSettings;
  userSettings: UserSettings;
}): ControlledTestEligibility {
  return evaluateControlledTestEligibility({
    approvedTestRecipient: recoverySettings.approvedTestRecipient,
    emailIdentityConfigured: getUserSettingsValidationError(userSettings) === null,
    livemode: recoverySettings.livemode,
    mode: recoverySettings.mode,
    recoveryConfigurationPersisted:
      recoverySettings.connected && recoverySettings.source === "persisted",
    stripeConnected: recoverySettings.connected,
  });
}
