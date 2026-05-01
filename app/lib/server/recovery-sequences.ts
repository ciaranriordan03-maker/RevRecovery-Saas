import "server-only";

import { createSupabaseAdminClient } from "../supabase/admin";
import type { FailedPaymentRecord } from "./stripe-webhooks";

export type RecoverySequenceRecord = {
  completed_at: string | null;
  created_at: string;
  current_step: number;
  failed_payment_id: string;
  id: string;
  metadata: {
    amountDue: number;
    attemptCount: number;
    currency: string | null;
    lastEventType: string;
  };
  started_at: string;
  status: string;
  stripe_account_id: string;
  stripe_customer_id: string | null;
  stripe_invoice_id: string;
  updated_at: string;
  user_id: string;
};

type RecoveryMessageInsert = {
  body_preview: string;
  channel: "email";
  failed_payment_id: string;
  message_key: string;
  metadata: {
    recommendedSendWindow: string;
  };
  scheduled_for: string;
  sequence_id: string;
  status: "pending";
  step_number: number;
  subject: string;
  user_id: string;
};

const RECOVERY_MESSAGES_TABLE = "recovery_messages";
const RECOVERY_SEQUENCES_TABLE = "recovery_sequences";

function addHours(isoTimestamp: string, hours: number) {
  const date = new Date(isoTimestamp);
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

function buildDefaultRecoveryMessages(
  failedPayment: FailedPaymentRecord,
  sequenceId: string,
): RecoveryMessageInsert[] {
  const baseScheduledAt = failedPayment.updated_at;

  return [
    {
      body_preview: "Your latest invoice payment did not go through. Update your payment details to avoid service interruption.",
      channel: "email",
      failed_payment_id: failedPayment.id,
      message_key: "email_1",
      metadata: {
        recommendedSendWindow: "immediate",
      },
      scheduled_for: baseScheduledAt,
      sequence_id: sequenceId,
      status: "pending",
      step_number: 1,
      subject: "Action needed: update your payment method",
      user_id: failedPayment.user_id,
    },
    {
      body_preview: "We will retry your payment soon. Update your billing details now to keep access uninterrupted.",
      channel: "email",
      failed_payment_id: failedPayment.id,
      message_key: "email_2",
      metadata: {
        recommendedSendWindow: "24_hours",
      },
      scheduled_for: addHours(baseScheduledAt, 24),
      sequence_id: sequenceId,
      status: "pending",
      step_number: 2,
      subject: "Reminder: your payment is still outstanding",
      user_id: failedPayment.user_id,
    },
    {
      body_preview: "This is the final reminder before access may be impacted. Please update your payment method today.",
      channel: "email",
      failed_payment_id: failedPayment.id,
      message_key: "email_3",
      metadata: {
        recommendedSendWindow: "72_hours",
      },
      scheduled_for: addHours(baseScheduledAt, 72),
      sequence_id: sequenceId,
      status: "pending",
      step_number: 3,
      subject: "Final reminder: prevent service interruption",
      user_id: failedPayment.user_id,
    },
  ];
}

export async function ensureRecoverySequenceForFailedPayment(
  failedPayment: FailedPaymentRecord,
) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { data: sequence, error: sequenceError } = await supabase
    .from(RECOVERY_SEQUENCES_TABLE)
    .upsert(
      {
        current_step: Math.max(failedPayment.attempt_count, 1),
        failed_payment_id: failedPayment.id,
        metadata: {
          amountDue: failedPayment.amount_due,
          attemptCount: failedPayment.attempt_count,
          currency: failedPayment.currency,
          lastEventType: failedPayment.last_event_type,
        },
        started_at: failedPayment.created_at,
        status: failedPayment.status === "recovered" ? "recovered" : "active",
        stripe_account_id: failedPayment.stripe_account_id,
        stripe_customer_id: failedPayment.stripe_customer_id,
        stripe_invoice_id: failedPayment.stripe_invoice_id,
        user_id: failedPayment.user_id,
      },
      { onConflict: "failed_payment_id" },
    )
    .select(
      "id, user_id, failed_payment_id, stripe_account_id, stripe_customer_id, stripe_invoice_id, status, current_step, started_at, completed_at, metadata, created_at, updated_at",
    )
    .single<RecoverySequenceRecord>();

  if (sequenceError || !sequence) {
    throw new Error(
      `Unable to save recovery sequence: ${sequenceError?.message ?? "Unknown error"}`,
    );
  }

  const { count, error: countError } = await supabase
    .from(RECOVERY_MESSAGES_TABLE)
    .select("id", { count: "exact", head: true })
    .eq("sequence_id", sequence.id);

  if (countError) {
    throw new Error(`Unable to inspect recovery messages: ${countError.message}`);
  }

  if ((count ?? 0) === 0 && sequence.status === "active") {
    const messages = buildDefaultRecoveryMessages(failedPayment, sequence.id);
    const { error: messageError } = await supabase.from(RECOVERY_MESSAGES_TABLE).insert(messages);

    if (messageError) {
      throw new Error(`Unable to seed recovery messages: ${messageError.message}`);
    }
  }

  return sequence;
}

export async function resolveRecoverySequenceForFailedPayment(
  failedPaymentId: string,
  completedAt: string,
) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { data: sequence, error: sequenceError } = await supabase
    .from(RECOVERY_SEQUENCES_TABLE)
    .update({
      completed_at: completedAt,
      status: "recovered",
    })
    .eq("failed_payment_id", failedPaymentId)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (sequenceError) {
    throw new Error(`Unable to complete recovery sequence: ${sequenceError.message}`);
  }

  if (!sequence) {
    return;
  }

  const { error: messageError } = await supabase
    .from(RECOVERY_MESSAGES_TABLE)
    .update({
      canceled_at: completedAt,
      status: "canceled",
    })
    .eq("sequence_id", sequence.id)
    .eq("status", "pending");

  if (messageError) {
    throw new Error(`Unable to cancel recovery messages: ${messageError.message}`);
  }
}
