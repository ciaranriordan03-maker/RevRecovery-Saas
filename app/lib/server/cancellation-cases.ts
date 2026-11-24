import "server-only";

import type Stripe from "stripe";
import { getCancellationSubscriptionSnapshot } from "../cancellation-rescue/state";
import { createSupabaseAdminClient } from "../supabase/admin";

export type CancellationEventSource =
  | "initial_sync"
  | "reconciliation"
  | "stripe_webhook";

export type CancellationEventRecordResult = {
  cancellation_case_id: string | null;
  case_status: string | null;
  episode_number: number;
  outcome: string;
};

function toIsoTimestamp(epochSeconds: number) {
  return new Date(epochSeconds * 1000).toISOString();
}

export async function ensureCancellationRescueSettings({
  livemode,
  stripeAccountId,
  userId,
}: {
  livemode: boolean;
  stripeAccountId: string;
  userId: string;
}) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { error } = await supabase
    .from("cancellation_rescue_settings")
    .upsert(
      {
        livemode,
        mode: "shadow",
        stripe_account_id: stripeAccountId,
        user_id: userId,
      },
      {
        ignoreDuplicates: true,
        onConflict: "user_id,stripe_account_id,livemode",
      },
    );

  if (error) {
    throw new Error(`Unable to initialize cancellation rescue settings: ${error.message}`);
  }
}

export async function recordCancellationSubscriptionEvent({
  eventCreated,
  eventType,
  livemode,
  source,
  sourceEventId,
  stripeAccountId,
  subscription,
  userId,
}: {
  eventCreated: number;
  eventType: "customer.subscription.deleted" | "customer.subscription.updated";
  livemode: boolean;
  source: CancellationEventSource;
  sourceEventId: string;
  stripeAccountId: string;
  subscription: Stripe.Subscription;
  userId: string;
}): Promise<CancellationEventRecordResult | null> {
  const snapshot = getCancellationSubscriptionSnapshot(subscription);

  if (!snapshot.stripeCustomerId || !snapshot.stripeSubscriptionId) {
    return null;
  }

  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  await ensureCancellationRescueSettings({ livemode, stripeAccountId, userId });
  const [{ data: accountSettings, error: settingsError }, { data: platformControl, error: controlError }] =
    await Promise.all([
      supabase
        .from("cancellation_rescue_settings")
        .select("shadow_processing_enabled")
        .eq("user_id", userId)
        .eq("stripe_account_id", stripeAccountId)
        .eq("livemode", livemode)
        .single<{ shadow_processing_enabled: boolean }>(),
      supabase
        .from("cancellation_platform_controls")
        .select("enabled")
        .eq("control_key", "shadow_processing")
        .single<{ enabled: boolean }>(),
    ]);
  if (settingsError || controlError) {
    throw new Error("Unable to verify cancellation shadow-processing controls.");
  }
  if (!accountSettings.shadow_processing_enabled || !platformControl.enabled) {
    return {
      cancellation_case_id: null,
      case_status: null,
      episode_number: 0,
      outcome: "shadow_processing_disabled",
    };
  }

  const eventCreatedAt = toIsoTimestamp(eventCreated);
  const sourceRank = source === "stripe_webhook" ? "3" : source === "reconciliation" ? "2" : "1";
  const orderingKey = `${sourceRank}:${sourceEventId}`;
  const { data: accepted, error: orderingError } = await supabase.rpc(
    "claim_cancellation_event_order",
    {
      requested_event_created_at: eventCreatedAt,
      requested_livemode: livemode,
      requested_source_event_id: orderingKey,
      requested_stripe_account_id: stripeAccountId,
      requested_stripe_subscription_id: snapshot.stripeSubscriptionId,
      requested_user_id: userId,
    },
  );
  if (orderingError) {
    throw new Error(`Unable to order cancellation event: ${orderingError.message}`);
  }
  if (accepted !== true) {
    return {
      cancellation_case_id: null,
      case_status: null,
      episode_number: 0,
      outcome: "ignored_stale_or_equal_order",
    };
  }

  const { data, error } = await supabase.rpc(
    "record_cancellation_subscription_event",
    {
      requested_cancel_at: snapshot.cancelAt,
      requested_cancel_at_period_end: snapshot.cancelAtPeriodEnd,
      requested_canceled_at: snapshot.canceledAt,
      requested_cancellation_comment: snapshot.cancellationComment,
      requested_cancellation_feedback: snapshot.cancellationFeedback,
      requested_cancellation_reason: snapshot.cancellationReason,
      requested_currency: snapshot.currency,
      requested_current_period_end: snapshot.currentPeriodEnd,
      requested_event_created_at: eventCreatedAt,
      requested_event_type: eventType,
      requested_latest_payload: subscription,
      requested_livemode: livemode,
      requested_recurring_interval: snapshot.recurringInterval,
      requested_recurring_interval_count: snapshot.recurringIntervalCount,
      requested_recurring_value_cents: snapshot.recurringValueCents,
      requested_recurring_value_source: snapshot.recurringValueSource,
      requested_source: source,
      requested_source_event_id: sourceEventId,
      requested_stripe_account_id: stripeAccountId,
      requested_stripe_customer_id: snapshot.stripeCustomerId,
      requested_stripe_subscription_id: snapshot.stripeSubscriptionId,
      requested_subscription_status: snapshot.subscriptionStatus,
      requested_user_id: userId,
    },
  );

  if (error) {
    throw new Error(`Unable to record cancellation event: ${error.message}`);
  }

  const result = (data?.[0] as CancellationEventRecordResult | undefined) ?? null;

  return result;
}

export async function reconcileScheduledCancellationSubscriptions({
  eventCreated = Math.floor(Date.now() / 1000),
  livemode,
  source = "reconciliation",
  stripeAccountId,
  subscriptions,
  userId,
}: {
  eventCreated?: number;
  livemode: boolean;
  source?: "initial_sync" | "reconciliation";
  stripeAccountId: string;
  subscriptions: Stripe.Subscription[];
  userId: string;
}) {
  await ensureCancellationRescueSettings({ livemode, stripeAccountId, userId });

  const results: Array<CancellationEventRecordResult | null> = [];

  for (const subscription of subscriptions) {
    const knownTerminalStatus = subscription.status === "canceled";
    const sourceVersion =
      subscription.canceled_at ??
      subscription.cancel_at ??
      (subscription as Stripe.Subscription & { current_period_end?: number | null })
        .current_period_end ??
      subscription.created;

    results.push(
      await recordCancellationSubscriptionEvent({
        eventCreated: subscription.canceled_at ?? eventCreated,
        eventType: knownTerminalStatus
          ? "customer.subscription.deleted"
          : "customer.subscription.updated",
        livemode,
        source,
        sourceEventId: `${source}:${subscription.id}:${sourceVersion}:${subscription.cancel_at_period_end ? "scheduled" : subscription.status}`,
        stripeAccountId,
        subscription,
        userId,
      }),
    );
  }

  return results;
}
