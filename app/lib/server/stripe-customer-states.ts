import "server-only";

import Stripe from "stripe";
import { createSupabaseAdminClient } from "../supabase/admin";

type StripeCustomerStateUpsert = {
  latest_event_type: string;
  latest_payload: Stripe.PaymentMethod | Stripe.Subscription;
  payment_method_updated_at?: string | null;
  stripe_account_id: string;
  stripe_customer_id: string;
  stripe_subscription_id?: string | null;
  subscription_deleted_at?: string | null;
  subscription_status?: string | null;
  subscription_updated_at?: string | null;
  user_id: string;
};

export type StripeCustomerStateRecord = {
  latest_event_type: string;
  payment_method_updated_at: string | null;
  stripe_account_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  subscription_deleted_at: string | null;
  subscription_status: string | null;
  subscription_updated_at: string | null;
};

const STRIPE_CUSTOMER_STATES_TABLE = "stripe_customer_states";

function getCustomerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null) {
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

export async function upsertStripeCustomerState(record: StripeCustomerStateUpsert) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { error } = await supabase.from(STRIPE_CUSTOMER_STATES_TABLE).upsert(record, {
    onConflict: "stripe_account_id,stripe_customer_id",
  });

  if (error) {
    throw new Error(`Unable to save Stripe customer state: ${error.message}`);
  }
}

export async function recordPaymentMethodUpdated({
  paymentMethod,
  stripeAccountId,
  userId,
}: {
  paymentMethod: Stripe.PaymentMethod;
  stripeAccountId: string;
  userId: string;
}) {
  const stripeCustomerId = getCustomerId(paymentMethod.customer);

  if (!stripeCustomerId) {
    return;
  }

  await upsertStripeCustomerState({
    latest_event_type: "payment_method.updated",
    latest_payload: paymentMethod,
    payment_method_updated_at: toIsoTimestamp(paymentMethod.created) ?? new Date().toISOString(),
    stripe_account_id: stripeAccountId,
    stripe_customer_id: stripeCustomerId,
    user_id: userId,
  });
}

export async function recordSubscriptionState({
  eventType,
  stripeAccountId,
  subscription,
  userId,
}: {
  eventType: "customer.subscription.deleted" | "customer.subscription.updated";
  stripeAccountId: string;
  subscription: Stripe.Subscription;
  userId: string;
}) {
  const stripeCustomerId = getCustomerId(subscription.customer);

  if (!stripeCustomerId) {
    return;
  }

  const isDeleted = eventType === "customer.subscription.deleted";
  const updatedAt = new Date().toISOString();

  await upsertStripeCustomerState({
    latest_event_type: eventType,
    latest_payload: subscription,
    stripe_account_id: stripeAccountId,
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: subscription.id,
    subscription_deleted_at: isDeleted ? updatedAt : null,
    subscription_status: subscription.status,
    subscription_updated_at: updatedAt,
    user_id: userId,
  });
}

export async function getStripeCustomerState({
  stripeAccountId,
  stripeCustomerId,
  userId,
}: {
  stripeAccountId: string;
  stripeCustomerId: string;
  userId: string;
}) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from(STRIPE_CUSTOMER_STATES_TABLE)
    .select(
      "stripe_account_id, stripe_customer_id, stripe_subscription_id, subscription_status, payment_method_updated_at, subscription_updated_at, subscription_deleted_at, latest_event_type",
    )
    .eq("user_id", userId)
    .eq("stripe_account_id", stripeAccountId)
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle<StripeCustomerStateRecord>();

  if (error) {
    throw new Error(`Unable to load Stripe customer state: ${error.message}`);
  }

  return data ?? null;
}
