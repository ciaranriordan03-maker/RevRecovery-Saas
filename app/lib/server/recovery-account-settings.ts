import "server-only";

import type { RecoveryMode } from "../recovery/mode-policy";
import {
  getRecoveryModeInputError,
  isRecoveryMode,
  normalizeApprovedTestRecipient,
} from "../recovery/mode-policy";
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

export type RecoveryModeSettings = {
  approvedTestRecipient: string | null;
  connected: boolean;
  editable: boolean;
  livemode: boolean | null;
  mode: RecoveryMode;
  source: "persisted" | "legacy_fallback" | "not_connected";
  stripeAccountId: string | null;
  timezone: string;
};

const RECOVERY_ACCOUNT_SETTINGS_TABLE = "recovery_account_settings";
const STRIPE_CONNECTIONS_TABLE = "stripe_connections";

function isMissingSettingsTableError(error: { code?: string } | null) {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

export class RecoveryModeSettingsError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "RecoveryModeSettingsError";
  }
}

async function getStripeConnectionIdentityForUser(userId: string) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from(STRIPE_CONNECTIONS_TABLE)
    .select("id, stripe_account_id, livemode, status")
    .eq("user_id", userId)
    .maybeSingle<{
      id: string;
      livemode: boolean | null;
      status: string;
      stripe_account_id: string;
    }>();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    livemode: data.livemode ?? false,
    status: data.status,
    stripeAccountId: data.stripe_account_id,
  };
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

export async function getRecoveryModeSettingsForUser(
  userId: string,
): Promise<RecoveryModeSettings> {
  const connection = await getStripeConnectionIdentityForUser(userId);

  if (!connection) {
    return {
      approvedTestRecipient: null,
      connected: false,
      editable: false,
      livemode: null,
      mode: "off",
      source: "not_connected",
      stripeAccountId: null,
      timezone: "UTC",
    };
  }

  const runtime = await getRecoveryAccountRuntimeSettings({
    livemode: connection.livemode,
    stripeAccountId: connection.stripeAccountId,
  });

  return {
    ...runtime,
    connected: connection.status === "connected",
    editable: runtime.source === "persisted",
    stripeAccountId: connection.stripeAccountId,
  };
}

export async function updateRecoveryModeSettingsForUser(
  userId: string,
  input: { approvedTestRecipient?: unknown; mode?: unknown },
): Promise<RecoveryModeSettings> {
  if (!isRecoveryMode(input.mode)) {
    throw new RecoveryModeSettingsError("Choose a valid recovery mode.", 400);
  }

  const approvedTestRecipient = normalizeApprovedTestRecipient(
    input.approvedTestRecipient,
  );
  const inputError = getRecoveryModeInputError({
    approvedTestRecipient,
    mode: input.mode,
  });

  if (inputError) {
    throw new RecoveryModeSettingsError(inputError, 400);
  }

  const connection = await getStripeConnectionIdentityForUser(userId);

  if (!connection || connection.status !== "connected") {
    throw new RecoveryModeSettingsError(
      "Connect Stripe before changing recovery delivery mode.",
      409,
    );
  }

  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new RecoveryModeSettingsError(
      "Recovery mode settings are unavailable.",
      503,
    );
  }

  await ensureRecoveryAccountSettings({
    livemode: connection.livemode,
    stripeAccountId: connection.stripeAccountId,
    stripeConnectionId: connection.id,
    userId,
  });

  const now = new Date().toISOString();
  const { error } = await supabase
    .from(RECOVERY_ACCOUNT_SETTINGS_TABLE)
    .update({
      approved_test_recipient: approvedTestRecipient,
      paused_at: input.mode === "paused" ? now : null,
      paused_reason: input.mode === "paused" ? "merchant_paused" : null,
      recovery_mode: input.mode,
      updated_at: now,
    })
    .eq("user_id", userId)
    .eq("stripe_connection_id", connection.id);

  if (error) {
    if (isMissingSettingsTableError(error)) {
      throw new RecoveryModeSettingsError(
        "Recovery mode controls will be available after the Phase 0 migration is approved.",
        503,
      );
    }

    throw new RecoveryModeSettingsError(
      `Unable to save recovery mode: ${error.message}`,
      500,
    );
  }

  return getRecoveryModeSettingsForUser(userId);
}
