import "server-only";

import type { UserSettings } from "../settings";
import { cloneSettings, defaultUserSettings, mergeUserSettings } from "../settings";
import { getStripeConnectionSummary } from "./stripe-connections";
import { createSupabaseAdminClient } from "../supabase/admin";

type SettingsRecord = {
  settings: UserSettings;
  storage: "memory" | "supabase";
  updatedAt: string | null;
  userId: string;
};

type PersistedSettingsRow = {
  settings: UserSettings;
  updated_at: string | null;
  user_id: string;
};

const USER_SETTINGS_TABLE = "user_settings";

function getMemoryStore() {
  const globalStore = globalThis as typeof globalThis & {
    __recoverFlowSettingsStore?: Map<string, SettingsRecord>;
  };

  if (!globalStore.__recoverFlowSettingsStore) {
    globalStore.__recoverFlowSettingsStore = new Map();
  }

  return globalStore.__recoverFlowSettingsStore;
}

function getSupabaseClient() {
  return createSupabaseAdminClient();
}

export function getSettingsUserId(request?: Request) {
  return (
    request?.headers.get("x-user-id") ??
    process.env.DEFAULT_USER_ID ??
    "demo-user"
  );
}

export async function getUserSettings(userId: string): Promise<SettingsRecord> {
  const supabase = getSupabaseClient();
  const stripeSummary = await getStripeConnectionSummary(userId);

  if (!supabase) {
    return applyStripeSummaryToRecord(getMemorySettings(userId), stripeSummary);
  }

  const { data, error } = await supabase
    .from(USER_SETTINGS_TABLE)
    .select("user_id, settings, updated_at")
    .eq("user_id", userId)
    .maybeSingle<PersistedSettingsRow>();

  if (error) {
    throw new Error(`Unable to load settings: ${error.message}`);
  }

  if (!data) {
    return applyStripeSummaryToRecord({
      settings: cloneSettings(defaultUserSettings),
      storage: "supabase",
      updatedAt: null,
      userId,
    }, stripeSummary);
  }

  return applyStripeSummaryToRecord({
    settings: mergeUserSettings(data.settings),
    storage: "supabase",
    updatedAt: data.updated_at,
    userId,
  }, stripeSummary);
}

export async function saveUserSettings(
  userId: string,
  settings: UserSettings,
): Promise<SettingsRecord> {
  const normalizedSettings = mergeUserSettings(settings);
  const now = new Date().toISOString();
  const supabase = getSupabaseClient();
  const stripeSummary = await getStripeConnectionSummary(userId);
  normalizedSettings.stripe = mapStripeSummaryToSettings(stripeSummary);

  if (!supabase) {
    const record = applyStripeSummaryToRecord({
      settings: normalizedSettings,
      storage: "memory" as const,
      updatedAt: now,
      userId,
    }, stripeSummary);

    getMemoryStore().set(userId, record);
    return record;
  }

  const { data, error } = await supabase
    .from(USER_SETTINGS_TABLE)
    .upsert(
      {
        settings: normalizedSettings,
        updated_at: now,
        user_id: userId,
      },
      {
        onConflict: "user_id",
      },
    )
    .select("user_id, settings, updated_at")
    .single<PersistedSettingsRow>();

  if (error) {
    throw new Error(`Unable to save settings: ${error.message}`);
  }

  return applyStripeSummaryToRecord({
    settings: mergeUserSettings(data.settings),
    storage: "supabase",
    updatedAt: data.updated_at,
    userId: data.user_id,
  }, stripeSummary);
}

export async function getEmailSettings(userId: string) {
  const record = await getUserSettings(userId);
  return record.settings.email;
}

function getMemorySettings(userId: string): SettingsRecord {
  const store = getMemoryStore();
  const existingRecord = store.get(userId);

  if (existingRecord) {
    return {
      ...existingRecord,
      settings: cloneSettings(existingRecord.settings),
    };
  }

  const record = {
    settings: cloneSettings(defaultUserSettings),
    storage: "memory" as const,
    updatedAt: null,
    userId,
  };

  store.set(userId, record);
  return record;
}

function applyStripeSummaryToRecord(
  record: SettingsRecord,
  stripeSummary: Awaited<ReturnType<typeof getStripeConnectionSummary>>,
) {
  return {
    ...record,
    settings: {
      ...record.settings,
      stripe: mapStripeSummaryToSettings(stripeSummary),
    },
  };
}

function mapStripeSummaryToSettings(
  stripeSummary: Awaited<ReturnType<typeof getStripeConnectionSummary>>,
): UserSettings["stripe"] {
  return {
    accountDisplayName: stripeSummary.accountDisplayName,
    accountEmail: stripeSummary.accountEmail ?? "",
    accountId: stripeSummary.stripeAccountId,
    accountLabel: stripeSummary.accountDisplayName ?? defaultUserSettings.stripe.accountLabel,
    connected: stripeSummary.connected,
    lastSyncedAt: stripeSummary.lastSyncedAt,
    status: stripeSummary.status,
  };
}
