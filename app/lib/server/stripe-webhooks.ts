import "server-only";

import Stripe from "stripe";
import { createSupabaseAdminClient } from "../supabase/admin";
import type { RecoveryCaseStatus } from "../stripe/recovery-state";

export type FailedPaymentRecord = {
  amount_due: number;
  attempt_count: number;
  created_at: string;
  currency: string | null;
  id: string;
  case_status: RecoveryCaseStatus | null;
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

export type StripeInvoiceEventRecord = {
  amountDue: number;
  amountPaid: number;
  attemptCount: number;
  billingReason: string | null;
  currency: string | null;
  declineCode: string | null;
  eventCreatedAt: string;
  eventType:
    | "invoice.paid"
    | "invoice.payment_failed"
    | "invoice.payment_succeeded"
    | "invoice.updated";
  failureCode: string | null;
  failureMessage: string | null;
  invoiceKind: "standalone" | "subscription" | "unknown";
  invoiceStatus: string | null;
  livemode: boolean;
  nextPaymentAttemptAt: string | null;
  payload: Stripe.Invoice;
  stripeAccountId: string;
  stripeChargeId: string | null;
  stripeCustomerId: string | null;
  stripeEventId: string;
  stripeInvoiceId: string;
  stripePaymentIntentId: string | null;
  stripeSubscriptionId: string | null;
  targetStatus: RecoveryCaseStatus | null;
  terminalReason: string | null;
  userId: string;
};

type WebhookEventInsert = {
  error_message?: string | null;
  event_created_at?: string | null;
  event_type: string;
  livemode: boolean;
  payload: Stripe.Event;
  processed_at?: string | null;
  status: "failed" | "processed" | "received";
  stripe_account_id: string;
  stripe_event_id: string;
  user_id: string | null;
};

export type WebhookEventRecord = {
  claim_expires_at: string | null;
  event_type: string;
  id: string;
  next_attempt_at: string | null;
  processing_attempt_count: number;
  status: "received" | "processing" | "processed" | "failed" | "ignored";
  stripe_event_id: string;
};

type WebhookCompletion = {
  claimToken: string;
  errorCode?: string;
  errorDetails?: Record<string, string>;
  ignoredReason?: string;
  nextAttemptAt?: string;
  outcome: "failed" | "ignored" | "processed";
  stripeEventId: string;
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

export async function claimWebhookEvent(stripeEventId: string, claimToken: string) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { data, error } = await supabase.rpc("claim_stripe_webhook_event", {
    lease_seconds: 120,
    requested_claim_token: claimToken,
    requested_event_id: stripeEventId,
  });

  if (error) {
    throw new Error(`Unable to claim Stripe webhook event: ${error.message}`);
  }

  return ((data?.[0] as WebhookEventRecord | undefined) ?? null);
}

export async function getWebhookEventRecord(stripeEventId: string) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { data, error } = await supabase
    .from(STRIPE_WEBHOOK_EVENTS_TABLE)
    .select(
      "id, stripe_event_id, event_type, status, processing_attempt_count, next_attempt_at, claim_expires_at",
    )
    .eq("stripe_event_id", stripeEventId)
    .maybeSingle<WebhookEventRecord>();

  if (error) {
    throw new Error(`Unable to load Stripe webhook event: ${error.message}`);
  }

  return data;
}

export async function completeWebhookEvent(completion: WebhookCompletion) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { data, error } = await supabase.rpc("complete_stripe_webhook_event", {
    requested_claim_token: completion.claimToken,
    requested_error_code: completion.errorCode ?? null,
    requested_error_details: completion.errorDetails ?? {},
    requested_event_id: completion.stripeEventId,
    requested_ignored_reason: completion.ignoredReason ?? null,
    requested_next_attempt_at: completion.nextAttemptAt ?? null,
    requested_outcome: completion.outcome,
  });

  if (error) {
    throw new Error(`Unable to complete Stripe webhook event: ${error.message}`);
  }

  if (data !== true) {
    throw new Error("Stripe webhook claim was lost before completion.");
  }
}

export async function requestWebhookEventReplay(
  stripeEventId: string,
  requestedBy: string | null = null,
) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { data, error } = await supabase.rpc("request_stripe_webhook_replay", {
    requested_by: requestedBy,
    requested_event_id: stripeEventId,
  });

  if (error) {
    throw new Error(`Unable to request Stripe webhook replay: ${error.message}`);
  }

  return data === true;
}

export async function getFailedPaymentForInvoice({
  stripeAccountId,
  stripeInvoiceId,
}: {
  stripeAccountId: string;
  stripeInvoiceId: string;
}) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { data, error } = await supabase
    .from(FAILED_PAYMENTS_TABLE)
    .select("id, case_status")
    .eq("stripe_account_id", stripeAccountId)
    .eq("stripe_invoice_id", stripeInvoiceId)
    .maybeSingle<{ case_status: RecoveryCaseStatus | null; id: string }>();

  if (error) {
    throw new Error(`Unable to load failed payment: ${error.message}`);
  }

  return data;
}

export async function recordStripeInvoiceEvent(record: StripeInvoiceEventRecord) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { data, error } = await supabase.rpc("record_stripe_invoice_event", {
    requested_amount_due: record.amountDue,
    requested_amount_paid: record.amountPaid,
    requested_attempt_count: record.attemptCount,
    requested_billing_reason: record.billingReason,
    requested_currency: record.currency,
    requested_decline_code: record.declineCode,
    requested_event_created_at: record.eventCreatedAt,
    requested_event_type: record.eventType,
    requested_failure_code: record.failureCode,
    requested_failure_message: record.failureMessage,
    requested_invoice_kind: record.invoiceKind,
    requested_invoice_status: record.invoiceStatus,
    requested_livemode: record.livemode,
    requested_next_payment_attempt_at: record.nextPaymentAttemptAt,
    requested_payload: record.payload,
    requested_stripe_account_id: record.stripeAccountId,
    requested_stripe_charge_id: record.stripeChargeId,
    requested_stripe_customer_id: record.stripeCustomerId,
    requested_stripe_event_id: record.stripeEventId,
    requested_stripe_invoice_id: record.stripeInvoiceId,
    requested_stripe_payment_intent_id: record.stripePaymentIntentId,
    requested_stripe_subscription_id: record.stripeSubscriptionId,
    requested_target_status: record.targetStatus,
    requested_terminal_reason: record.terminalReason,
    requested_user_id: record.userId,
  });

  if (error) {
    throw new Error(`Unable to apply Stripe invoice event: ${error.message}`);
  }

  return ((data?.[0] as FailedPaymentRecord | undefined) ?? null);
}

export async function pauseRecoveryCasesForPaymentMethod({
  eventCreatedAt,
  livemode,
  stripeAccountId,
  stripeCustomerId,
  stripeEventId,
  userId,
}: {
  eventCreatedAt: string;
  livemode: boolean;
  stripeAccountId: string;
  stripeCustomerId: string;
  stripeEventId: string;
  userId: string;
}) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { data, error } = await supabase.rpc(
    "pause_recovery_cases_for_payment_method",
    {
      requested_event_created_at: eventCreatedAt,
      requested_livemode: livemode,
      requested_stripe_account_id: stripeAccountId,
      requested_stripe_customer_id: stripeCustomerId,
      requested_stripe_event_id: stripeEventId,
      requested_user_id: userId,
    },
  );

  if (error) {
    throw new Error(`Unable to pause recovery cases: ${error.message}`);
  }

  return typeof data === "number" ? data : 0;
}
