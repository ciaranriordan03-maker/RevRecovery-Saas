import "server-only";

import {
  RetentionSettingsInputError,
  validateRetentionSettingsInput,
  type RetentionSettingsInput,
} from "../retention/settings-policy";
import { createSupabaseAdminClient } from "../supabase/admin";

const RETENTION_SETTINGS_TABLE = "retention_account_settings";
const STRIPE_CONNECTIONS_TABLE = "stripe_connections";

type StripeConnectionIdentity = {
  id: string;
  status: string;
};

type RetentionSettingsRow = {
  downgrade_action_enabled: boolean;
  eligible_downgrade_price_ids: string[];
  observation_enabled: boolean;
  pause_action_enabled: boolean;
  support_action_enabled: boolean;
  support_contact_email: string | null;
};

export type RetentionSettings = {
  connected: boolean;
  downgradeActionEnabled: boolean;
  editable: boolean;
  eligibleDowngradePriceIds: string[];
  observationEnabled: boolean;
  pauseActionEnabled: boolean;
  supportActionEnabled: boolean;
  supportContactEmail: string | null;
};

function isMissingRetentionTableError(error: { code?: string } | null) {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

function defaultSettings({
  connected,
  editable,
}: {
  connected: boolean;
  editable: boolean;
}): RetentionSettings {
  return {
    connected,
    downgradeActionEnabled: false,
    editable,
    eligibleDowngradePriceIds: [],
    observationEnabled: true,
    pauseActionEnabled: false,
    supportActionEnabled: false,
    supportContactEmail: null,
  };
}

async function getConnection(userId: string) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from(STRIPE_CONNECTIONS_TABLE)
    .select("id, status")
    .eq("user_id", userId)
    .maybeSingle<StripeConnectionIdentity>();

  return error ? null : data;
}

export class RetentionSettingsError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "RetentionSettingsError";
  }
}

export async function ensureRetentionAccountSettings({
  stripeConnectionId,
  userId,
}: {
  stripeConnectionId: string;
  userId: string;
}) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { error } = await supabase.from(RETENTION_SETTINGS_TABLE).upsert(
    {
      stripe_connection_id: stripeConnectionId,
      user_id: userId,
    },
    { onConflict: "user_id,stripe_connection_id" },
  );

  if (error && !isMissingRetentionTableError(error)) {
    throw new Error(`Unable to initialize retention settings: ${error.message}`);
  }
}

export async function getRetentionSettingsForUser(
  userId: string,
): Promise<RetentionSettings> {
  const connection = await getConnection(userId);

  if (!connection) {
    return defaultSettings({ connected: false, editable: false });
  }

  const connected = connection.status === "connected";
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return defaultSettings({ connected, editable: false });
  }

  const { data, error } = await supabase
    .from(RETENTION_SETTINGS_TABLE)
    .select(
      "observation_enabled, support_action_enabled, support_contact_email, pause_action_enabled, downgrade_action_enabled, eligible_downgrade_price_ids",
    )
    .eq("user_id", userId)
    .eq("stripe_connection_id", connection.id)
    .maybeSingle<RetentionSettingsRow>();

  if (error) {
    if (isMissingRetentionTableError(error)) {
      return defaultSettings({ connected, editable: false });
    }
    throw new Error(`Unable to load retention settings: ${error.message}`);
  }

  if (!data) {
    await ensureRetentionAccountSettings({
      stripeConnectionId: connection.id,
      userId,
    });
    return defaultSettings({ connected, editable: true });
  }

  return {
    connected,
    downgradeActionEnabled: data.downgrade_action_enabled,
    editable: true,
    eligibleDowngradePriceIds: data.eligible_downgrade_price_ids,
    observationEnabled: data.observation_enabled,
    pauseActionEnabled: data.pause_action_enabled,
    supportActionEnabled: data.support_action_enabled,
    supportContactEmail: data.support_contact_email,
  };
}

export async function updateRetentionSettingsForUser(
  userId: string,
  input: RetentionSettingsInput,
): Promise<RetentionSettings> {
  let validated;
  try {
    validated = validateRetentionSettingsInput(input);
  } catch (error) {
    if (error instanceof RetentionSettingsInputError) {
      throw new RetentionSettingsError(error.message, 400);
    }
    throw error;
  }

  const connection = await getConnection(userId);
  if (!connection || connection.status !== "connected") {
    throw new RetentionSettingsError(
      "Connect Stripe before configuring retention actions.",
      409,
    );
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new RetentionSettingsError("Retention settings are unavailable.", 503);
  }

  await ensureRetentionAccountSettings({
    stripeConnectionId: connection.id,
    userId,
  });

  const { error } = await supabase
    .from(RETENTION_SETTINGS_TABLE)
    .update({
      downgrade_action_enabled: validated.downgradeActionEnabled,
      eligible_downgrade_price_ids: validated.eligibleDowngradePriceIds,
      pause_action_enabled: validated.pauseActionEnabled,
      support_action_enabled: validated.supportActionEnabled,
      support_contact_email: validated.supportContactEmail,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("stripe_connection_id", connection.id);

  if (error) {
    if (isMissingRetentionTableError(error)) {
      throw new RetentionSettingsError(
        "Retention settings will be available after the Phase 4 migrations are approved.",
        503,
      );
    }
    throw new RetentionSettingsError(
      `Unable to save retention settings: ${error.message}`,
      500,
    );
  }

  return getRetentionSettingsForUser(userId);
}
