import "server-only";

import type { RecoveryMode } from "../recovery/mode-policy";
import {
  getRecoveryModeInputError,
  isRecoveryMode,
  normalizeApprovedTestRecipient,
} from "../recovery/mode-policy";
import {
  buildRecoveryScheduleSnapshot,
  DEFAULT_RECOVERY_SCHEDULE_ID,
  getRecoverySchedule,
  isRecoveryScheduleId,
  isValidTimezone,
  type RecoveryScheduleId,
  type RecoveryScheduleSnapshot,
} from "../recovery/schedule-policy";
import { createSupabaseAdminClient } from "../supabase/admin";

type RecoveryAccountSettingsRow = {
  approved_test_recipient: string | null;
  active_policy_version_id: string | null;
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
  policyVersionId: string | null;
  schedule: RecoveryScheduleSnapshot;
  source: "persisted" | "legacy_fallback";
  timezone: string;
};

export type RecoveryModeSettings = {
  approvedTestRecipient: string | null;
  connected: boolean;
  editable: boolean;
  livemode: boolean | null;
  mode: RecoveryMode;
  scheduleId: RecoveryScheduleId;
  source: "persisted" | "legacy_fallback" | "not_connected";
  stripeAccountId: string | null;
  timezone: string;
};

const RECOVERY_ACCOUNT_SETTINGS_TABLE = "recovery_account_settings";
const RECOVERY_POLICY_STEPS_TABLE = "recovery_policy_steps";
const RECOVERY_POLICY_VERSIONS_TABLE = "recovery_policy_versions";
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

async function getScheduleSnapshot({
  policyVersionId,
  timezone,
}: {
  policyVersionId: string | null;
  timezone: string;
}): Promise<RecoveryScheduleSnapshot> {
  const fallback = buildRecoveryScheduleSnapshot({
    scheduleId: DEFAULT_RECOVERY_SCHEDULE_ID,
    timezone,
  });

  if (!policyVersionId) {
    return fallback;
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return fallback;
  }

  const { data: version, error: versionError } = await supabase
    .from(RECOVERY_POLICY_VERSIONS_TABLE)
    .select("id, version, timezone, configuration")
    .eq("id", policyVersionId)
    .maybeSingle<{
      configuration: { scheduleId?: unknown } | null;
      id: string;
      timezone: string;
      version: number;
    }>();

  if (versionError || !version) {
    if (isMissingSettingsTableError(versionError)) {
      return fallback;
    }
    throw new Error(`Unable to load recovery schedule: ${versionError?.message ?? "Policy not found"}`);
  }

  const { data: steps, error: stepsError } = await supabase
    .from(RECOVERY_POLICY_STEPS_TABLE)
    .select("step_number, offset_minutes")
    .eq("policy_version_id", policyVersionId)
    .order("step_number", { ascending: true });

  if (stepsError) {
    throw new Error(`Unable to load recovery schedule steps: ${stepsError.message}`);
  }

  const scheduleId = version.configuration?.scheduleId;
  if (!isRecoveryScheduleId(scheduleId)) {
    throw new Error("Recovery schedule configuration is invalid.");
  }

  const expectedOffsets = getRecoverySchedule(scheduleId).offsetsMinutes;
  const storedOffsets = (steps ?? []).map((step) => step.offset_minutes);
  if (
    storedOffsets.length !== expectedOffsets.length ||
    storedOffsets.some((offset, index) => offset !== expectedOffsets[index])
  ) {
    throw new Error("Recovery schedule steps do not match the published policy.");
  }

  return buildRecoveryScheduleSnapshot({
    policyVersion: version.version,
    scheduleId,
    timezone: version.timezone,
  });
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
    policyVersionId: null,
    schedule: buildRecoveryScheduleSnapshot({
      scheduleId: DEFAULT_RECOVERY_SCHEDULE_ID,
      timezone: "UTC",
    }),
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
      "user_id, stripe_connection_id, stripe_account_id, livemode, recovery_mode, approved_test_recipient, timezone, active_policy_version_id",
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

  const schedule = await getScheduleSnapshot({
    policyVersionId: data.active_policy_version_id,
    timezone: data.timezone,
  });

  return {
    approvedTestRecipient: data.approved_test_recipient,
    livemode: data.livemode,
    mode: data.recovery_mode,
    policyVersionId: data.active_policy_version_id,
    schedule,
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
      scheduleId: DEFAULT_RECOVERY_SCHEDULE_ID,
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
    approvedTestRecipient: runtime.approvedTestRecipient,
    connected: connection.status === "connected",
    editable: runtime.source === "persisted",
    livemode: runtime.livemode,
    mode: runtime.mode,
    scheduleId: runtime.schedule.scheduleId,
    source: runtime.source,
    stripeAccountId: connection.stripeAccountId,
    timezone: runtime.timezone,
  };
}

export async function updateRecoveryModeSettingsForUser(
  userId: string,
  input: {
    approvedTestRecipient?: unknown;
    mode?: unknown;
    scheduleId?: unknown;
    timezone?: unknown;
  },
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

  if (!isRecoveryScheduleId(input.scheduleId)) {
    throw new RecoveryModeSettingsError("Choose a valid recovery schedule.", 400);
  }

  if (!isValidTimezone(input.timezone)) {
    throw new RecoveryModeSettingsError("Choose a valid recovery timezone.", 400);
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

  const schedule = getRecoverySchedule(input.scheduleId);
  const { error: policyError } = await supabase.rpc("publish_recovery_policy", {
    requested_approved_test_recipient: approvedTestRecipient,
    requested_connection_id: connection.id,
    requested_mode: input.mode,
    requested_offsets: [...schedule.offsetsMinutes],
    requested_schedule_id: input.scheduleId,
    requested_timezone: input.timezone.trim(),
    requested_user_id: userId,
  });

  if (policyError) {
    if (isMissingSettingsTableError(policyError) || policyError.code === "PGRST202") {
      throw new RecoveryModeSettingsError(
        "Recovery schedules will be available after the Batch 7 migration is approved.",
        503,
      );
    }

    throw new RecoveryModeSettingsError(
      `Unable to publish recovery schedule: ${policyError.message}`,
      500,
    );
  }

  return getRecoveryModeSettingsForUser(userId);
}
