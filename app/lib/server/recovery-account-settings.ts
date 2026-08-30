import "server-only";

import type { RecoveryMode } from "../recovery/mode-policy";
import { isRecoveryMode } from "../recovery/mode-policy";
import { createSupabaseAdminClient } from "../supabase/admin";

type RecoveryAccountSettingsRow = {
  approved_test_recipient: string | null;
  livemode: boolean;
  recovery_mode: string;
  stripe_account_id: string;
  stripe_connection_id: string;
  timezone: string;
  user_id: string;
};

export type RecoveryAccountRuntimeSettings = {
  approvedTestRecipient: string | null;
  livemode: boolean;
  mode: RecoveryMode;
  source: "persisted" | "legacy_fallback";
  timezone: string;
};

const RECOVERY_ACCOUNT_SETTINGS_TABLE = "recovery_account_settings";

function isMissingSettingsTableError(error: { code?: string } | null) {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

export async function ensureRecoveryAccountSettings({
  livemode,
  stripeAccountId,
  stripeConnectionId,
  userId,
}: {
  livemode: boolean;
  stripeAccountId: string;
  stripeConnectionId: string;
  userId: string;
}) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { error } = await supabase.from(RECOVERY_ACCOUNT_SETTINGS_TABLE).upsert(
    {
      livemode,
      stripe_account_id: stripeAccountId,
      stripe_connection_id: stripeConnectionId,
      user_id: userId,
    },
    { onConflict: "stripe_connection_id" },
  );

  if (error && !isMissingSettingsTableError(error)) {
    throw new Error(`Unable to initialize recovery mode: ${error.message}`);
  }
}

export async function getRecoveryAccountRuntimeSettings({
  livemode,
  stripeAccountId,
}: {
  livemode: boolean;
  stripeAccountId: string;
}): Promise<RecoveryAccountRuntimeSettings> {
  const legacyFallback: RecoveryAccountRuntimeSettings = {
    approvedTestRecipient: null,
    livemode,
    mode: "live",
    source: "legacy_fallback",
    timezone: "UTC",
  };
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return legacyFallback;
  }

  const { data, error } = await supabase
    .from(RECOVERY_ACCOUNT_SETTINGS_TABLE)
    .select(
      "user_id, stripe_connection_id, stripe_account_id, livemode, recovery_mode, approved_test_recipient, timezone",
    )
    .eq("stripe_account_id", stripeAccountId)
    .eq("livemode", livemode)
    .maybeSingle<RecoveryAccountSettingsRow>();

  if (error) {
    if (isMissingSettingsTableError(error)) {
      return legacyFallback;
    }

    throw new Error(`Unable to load recovery mode: ${error.message}`);
  }

  if (!data) {
    return legacyFallback;
  }

  if (!isRecoveryMode(data.recovery_mode)) {
    throw new Error("Recovery mode configuration is invalid.");
  }

  return {
    approvedTestRecipient: data.approved_test_recipient,
    livemode: data.livemode,
    mode: data.recovery_mode,
    source: "persisted",
    timezone: data.timezone,
  };
}
