import "server-only";

import { createSupabaseAdminClient } from "../supabase/admin";

export type StripeSyncSummary = {
  activeSubscriptionsCount: number;
  atRiskCustomersCount: number;
  customersCount: number;
  failedPaymentsCount: number;
  recentFailedInvoices: Array<{
    amountDue: number;
    attemptCount: number;
    currency: string | null;
    customerId: string | null;
    invoiceId: string;
    status: string | null;
  }>;
  revenueAtRiskAmount: number;
  revenueAtRiskCurrency: string | null;
};

export type StripeConnectionRecord = {
  access_token: string;
  account_display_name: string | null;
  account_email: string | null;
  connected_at: string;
  id: string;
  last_synced_at: string | null;
  livemode: boolean | null;
  refresh_token: string | null;
  scope: string | null;
  status: string;
  stripe_account_id: string;
  sync_summary: StripeSyncSummary | null;
  updated_at: string;
  user_id: string;
};

export type StripeConnectionSummary = {
  accountDisplayName: string | null;
  accountEmail: string | null;
  connected: boolean;
  connectedAt: string | null;
  lastSyncedAt: string | null;
  status: string;
  stripeAccountId: string | null;
  syncSummary: StripeSyncSummary | null;
};

type StripeConnectionUpsert = {
  access_token: string;
  account_display_name: string | null;
  account_email: string | null;
  connected_at: string;
  last_synced_at: string | null;
  livemode: boolean | null;
  refresh_token: string | null;
  scope: string | null;
  status: string;
  stripe_account_id: string;
  sync_summary: StripeSyncSummary | null;
  user_id: string;
};

const STRIPE_CONNECTIONS_TABLE = "stripe_connections";

export async function getStripeConnectionForUser(userId: string) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from(STRIPE_CONNECTIONS_TABLE)
    .select(
      "id, user_id, stripe_account_id, access_token, refresh_token, connected_at, status, account_email, account_display_name, scope, livemode, last_synced_at, sync_summary, updated_at",
    )
    .eq("user_id", userId)
    .maybeSingle<StripeConnectionRecord>();

  if (error) {
    return null;
  }

  return data ?? null;
}

export async function getStripeConnectionForAccount(stripeAccountId: string) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from(STRIPE_CONNECTIONS_TABLE)
    .select(
      "id, user_id, stripe_account_id, access_token, refresh_token, connected_at, status, account_email, account_display_name, scope, livemode, last_synced_at, sync_summary, updated_at",
    )
    .eq("stripe_account_id", stripeAccountId)
    .maybeSingle<StripeConnectionRecord>();

  if (error) {
    return null;
  }

  return data ?? null;
}

export async function upsertStripeConnection(connection: StripeConnectionUpsert) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { data, error } = await supabase
    .from(STRIPE_CONNECTIONS_TABLE)
    .upsert(connection, {
      onConflict: "user_id",
    })
    .select(
      "id, user_id, stripe_account_id, access_token, refresh_token, connected_at, status, account_email, account_display_name, scope, livemode, last_synced_at, sync_summary, updated_at",
    )
    .single<StripeConnectionRecord>();

  if (error) {
    throw new Error(`Unable to save Stripe connection: ${error.message}`);
  }

  return data;
}

export async function updateStripeConnectionStatus(
  stripeAccountId: string,
  status: string,
) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { error } = await supabase
    .from(STRIPE_CONNECTIONS_TABLE)
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_account_id", stripeAccountId);

  if (error) {
    throw new Error(`Unable to update Stripe connection status: ${error.message}`);
  }
}

export async function getStripeConnectionSummary(userId: string): Promise<StripeConnectionSummary> {
  const connection = await getStripeConnectionForUser(userId);

  if (!connection) {
    return {
      accountDisplayName: null,
      accountEmail: null,
      connected: false,
      connectedAt: null,
      lastSyncedAt: null,
      status: "not_connected",
      stripeAccountId: null,
      syncSummary: null,
    };
  }

  return {
    accountDisplayName: connection.account_display_name,
    accountEmail: connection.account_email,
    connected: connection.status === "connected",
    connectedAt: connection.connected_at,
    lastSyncedAt: connection.last_synced_at,
    status: connection.status,
    stripeAccountId: connection.stripe_account_id,
    syncSummary: connection.sync_summary,
  };
}
