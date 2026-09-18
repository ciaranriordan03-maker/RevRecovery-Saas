import "server-only";

import type Stripe from "stripe";
import { decideSubscriptionChurn } from "../retention/churn-policy";
import { createSupabaseAdminClient } from "../supabase/admin";

function getCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
) {
  if (!customer) {
    return null;
  }

  return typeof customer === "string" ? customer : customer.id;
}

function toIsoTimestamp(epochSeconds: number | null | undefined) {
  if (!epochSeconds) {
    return null;
  }

  return new Date(epochSeconds * 1000).toISOString();
}

function getRecurringAmount(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];

  return {
    amount: item?.price.unit_amount ?? null,
    currency: item?.price.currency ?? null,
    interval: item?.price.recurring?.interval ?? null,
    intervalCount: item?.price.recurring?.interval_count ?? null,
    priceId: item?.price.id ?? null,
    productId:
      typeof item?.price.product === "string"
        ? item.price.product
        : item?.price.product?.id ?? null,
  };
}

export async function recordRetentionSubscriptionEvent({
  eventCreatedAt,
  eventType,
  livemode,
  stripeAccountId,
  stripeEventId,
  subscription,
  userId,
}: {
  eventCreatedAt: string;
  eventType: "customer.subscription.deleted" | "customer.subscription.updated";
  livemode: boolean;
  stripeAccountId: string;
  stripeEventId: string;
  subscription: Stripe.Subscription;
  userId: string;
}) {
  const stripeCustomerId = getCustomerId(subscription.customer);

  if (!stripeCustomerId) {
    return null;
  }

  const decision = decideSubscriptionChurn({
    cancelAt: subscription.cancel_at,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    canceledAt: subscription.canceled_at,
    cancellationReason: subscription.cancellation_details?.reason ?? null,
    eventType,
    status: subscription.status,
  });

  if (decision.disposition === "ignored_nonvoluntary") {
    return null;
  }

  const recurring = getRecurringAmount(subscription);
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { data, error } = await supabase.rpc(
    "record_retention_subscription_event",
    {
      requested_cancel_at: toIsoTimestamp(subscription.cancel_at),
      requested_cancel_at_period_end: subscription.cancel_at_period_end,
      requested_canceled_at: toIsoTimestamp(subscription.canceled_at),
      requested_cancellation_comment:
        subscription.cancellation_details?.comment ?? null,
      requested_cancellation_reason: decision.cancellationReason,
      requested_cancellation_type: decision.cancellationType,
      requested_currency: recurring.currency,
      requested_disposition: decision.disposition,
      requested_event_created_at: eventCreatedAt,
      requested_event_type: eventType,
      requested_interval: recurring.interval,
      requested_interval_count: recurring.intervalCount,
      requested_livemode: livemode,
      requested_payload: subscription,
      requested_price_id: recurring.priceId,
      requested_product_id: recurring.productId,
      requested_recurring_amount: recurring.amount,
      requested_stripe_account_id: stripeAccountId,
      requested_stripe_customer_id: stripeCustomerId,
      requested_stripe_event_id: stripeEventId,
      requested_stripe_subscription_id: subscription.id,
      requested_subscription_status: subscription.status,
      requested_user_id: userId,
    },
  );

  if (error) {
    throw new Error(`Unable to record retention case: ${error.message}`);
  }

  return typeof data === "string" ? data : null;
}
