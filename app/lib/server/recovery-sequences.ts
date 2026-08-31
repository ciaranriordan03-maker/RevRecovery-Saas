import "server-only";

import { createSupabaseAdminClient } from "../supabase/admin";
import { canScheduleRecoveryMessages } from "../recovery/mode-policy";
import { getRecoveryAccountRuntimeSettings } from "./recovery-account-settings";
import {
  scheduleFromOffset,
  type RecoveryScheduleSnapshot,
} from "../recovery/schedule-policy";
import type { FailedPaymentRecord } from "./stripe-webhooks";
import { RECOVERY_MESSAGE_TEMPLATES } from "../recovery/message-templates";

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
  configuration_snapshot: RecoveryScheduleSnapshot;
  policy_version_id: string | null;
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

export function buildRecoveryMessages(
  failedPayment: FailedPaymentRecord,
  sequenceId: string,
  schedule: RecoveryScheduleSnapshot,
): RecoveryMessageInsert[] {
  const baseScheduledAt = failedPayment.updated_at;
  return RECOVERY_MESSAGE_TEMPLATES.map((template, index) => {
    const offsetMinutes = schedule.offsetsMinutes[index];

    return {
      body_preview: template.bodyPreview,
      channel: "email",
      failed_payment_id: failedPayment.id,
      message_key: template.messageKey,
      metadata: {
        recommendedSendWindow: `offset_minutes_${offsetMinutes}`,
      },
      scheduled_for: scheduleFromOffset(baseScheduledAt, offsetMinutes),
      sequence_id: sequenceId,
      status: "pending",
      step_number: index + 1,
      subject: template.subject,
      user_id: failedPayment.user_id,
    } satisfies RecoveryMessageInsert;
  });
}

export async function ensureRecoverySequenceForFailedPayment(
  failedPayment: FailedPaymentRecord,
) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const accountSettings = await getRecoveryAccountRuntimeSettings({
    livemode: failedPayment.livemode ?? false,
    stripeAccountId: failedPayment.stripe_account_id,
  });

  if (!canScheduleRecoveryMessages(accountSettings.mode)) {
    return null;
  }

  const sequenceSelect =
    "id, user_id, failed_payment_id, stripe_account_id, stripe_customer_id, stripe_invoice_id, status, current_step, started_at, completed_at, metadata, policy_version_id, configuration_snapshot, created_at, updated_at";
  const { data: existingSequence, error: existingSequenceError } = await supabase
    .from(RECOVERY_SEQUENCES_TABLE)
    .select(sequenceSelect)
    .eq("failed_payment_id", failedPayment.id)
    .maybeSingle<RecoverySequenceRecord>();

  if (existingSequenceError) {
    throw new Error(`Unable to inspect recovery sequence: ${existingSequenceError.message}`);
  }

  let sequence = existingSequence;

  if (!sequence) {
    const { error: snapshotError } = await supabase
      .from("failed_payments")
      .update({
        policy_snapshot: accountSettings.schedule,
      })
      .eq("id", failedPayment.id);

    if (snapshotError) {
      throw new Error(`Unable to snapshot recovery policy: ${snapshotError.message}`);
    }

    const { data: insertedSequence, error: sequenceError } = await supabase
      .from(RECOVERY_SEQUENCES_TABLE)
      .insert({
        configuration_snapshot: accountSettings.schedule,
        current_step: Math.max(failedPayment.attempt_count, 1),
        failed_payment_id: failedPayment.id,
        metadata: {
          amountDue: failedPayment.amount_due,
          attemptCount: failedPayment.attempt_count,
          currency: failedPayment.currency,
          lastEventType: failedPayment.last_event_type,
        },
        policy_version_id: accountSettings.policyVersionId,
        started_at: failedPayment.created_at,
        status: failedPayment.status === "recovered" ? "recovered" : "active",
        stripe_account_id: failedPayment.stripe_account_id,
        stripe_customer_id: failedPayment.stripe_customer_id,
        stripe_invoice_id: failedPayment.stripe_invoice_id,
        user_id: failedPayment.user_id,
      })
      .select(sequenceSelect)
      .single<RecoverySequenceRecord>();

    if (sequenceError && sequenceError.code !== "23505") {
      throw new Error(
        `Unable to save recovery sequence: ${sequenceError.message}`,
      );
    }

    if (insertedSequence) {
      sequence = insertedSequence;
    } else {
      const { data: concurrentSequence, error: concurrentSequenceError } = await supabase
        .from(RECOVERY_SEQUENCES_TABLE)
        .select(sequenceSelect)
        .eq("failed_payment_id", failedPayment.id)
        .single<RecoverySequenceRecord>();

      if (concurrentSequenceError || !concurrentSequence) {
        throw new Error(
          `Unable to load concurrent recovery sequence: ${concurrentSequenceError?.message ?? "Unknown error"}`,
        );
      }

      sequence = concurrentSequence;
    }
  }

  const { count, error: countError } = await supabase
    .from(RECOVERY_MESSAGES_TABLE)
    .select("id", { count: "exact", head: true })
    .eq("sequence_id", sequence.id);

  if (countError) {
    throw new Error(`Unable to inspect recovery messages: ${countError.message}`);
  }

  if ((count ?? 0) === 0 && sequence.status === "active") {
    const messages = buildRecoveryMessages(
      failedPayment,
      sequence.id,
      sequence.configuration_snapshot,
    );
    const { error: messageError } = await supabase
      .from(RECOVERY_MESSAGES_TABLE)
      .upsert(messages, {
        ignoreDuplicates: true,
        onConflict: "sequence_id,message_key",
      });

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
