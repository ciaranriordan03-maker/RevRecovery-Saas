import "server-only";

import Stripe from "stripe";
import { createSupabaseAdminClient } from "../supabase/admin";

export type FailedPaymentRecord = {
  amount_due: number;
  attempt_count: number;
  created_at: string;
  currency: string | null;
  id: string;
  last_event_type: string;
  latest_payload: Stripe.Invoice | Stripe.Subscription | Stripe.PaymentMethod;
  next_payment_attempt_at: string | null;
  recovered_at: string | null;
  recovery_stage: string;
  status: string;
  stripe_account_id: string;
  stripe_customer_id: string | null;
  stripe_invoice_id: string;
  stripe_subscription_id: string | null;
  updated_at: string;
  user_id: string;
};

type FailedPaymentUpsert = {
  amount_due: number;
  attempt_count: number;
  currency: string | null;
  last_event_type: string;
  latest_payload: Stripe.Invoice | Stripe.Subscription | Stripe.PaymentMethod;
  next_payment_attempt_at: string | null;
  recovered_at?: string | null;
  recovery_stage: string;
  status: string;
  stripe_account_id: string;
  stripe_customer_id: string | null;
  stripe_invoice_id: string;
  stripe_subscription_id: string | null;
  user_id: string;
};

type WebhookEventInsert = {
  error_message?: string | null;
  event_type: string;
  livemode: boolean;
  payload: Stripe.Event;
  processed_at?: string | null;
  status: "failed" | "processed" | "received";
  stripe_account_id: string;
  stripe_event_id: string;
  user_id: string | null;
};

const FAILED_PAYMENTS_TABLE = "failed_payments";
const STRIPE_WEBHOOK_EVENTS_TABLE = "stripe_webhook_events";

export async function insertWebhookEventRecord(record: WebhookEventInsert) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { error } = await supabase.from(STRIPE_WEBHOOK_EVENTS_TABLE).insert(record);

  if (!error) {
    return { inserted: true };
  }

  if (error.code === "23505") {
    return { inserted: false };
  }

  throw new Error(`Unable to store Stripe webhook event: ${error.message}`);
}

export async function markWebhookEventProcessed(
  stripeEventId: string,
  status: "failed" | "processed",
  errorMessage?: string,
) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { error } = await supabase
    .from(STRIPE_WEBHOOK_EVENTS_TABLE)
    .update({
      error_message: errorMessage ?? null,
      processed_at: new Date().toISOString(),
      status,
    })
    .eq("stripe_event_id", stripeEventId);

  if (error) {
    throw new Error(`Unable to update Stripe webhook event: ${error.message}`);
  }
}

export async function upsertFailedPayment(record: FailedPaymentUpsert) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { data, error } = await supabase
    .from(FAILED_PAYMENTS_TABLE)
    .upsert(record, {
      onConflict: "stripe_invoice_id",
    })
    .select(
      "id, user_id, stripe_account_id, stripe_customer_id, stripe_subscription_id, stripe_invoice_id, amount_due, currency, attempt_count, next_payment_attempt_at, status, recovery_stage, recovered_at, last_event_type, latest_payload, created_at, updated_at",
    )
    .single<FailedPaymentRecord>();

  if (error) {
    throw new Error(`Unable to save failed payment: ${error.message}`);
  }

  return data;
}
