import "server-only";

import { createSupabaseAdminClient } from "../supabase/admin";
import type { VerifiedResendWebhookEvent } from "./resend-webhooks";
import { tryRecordPreviewRecoveryNotificationEvent } from "./recovery-notification-events";

export type PersistRecoveryMessageEventResult = {
  inserted: boolean;
  matched: boolean;
};

const ATTENTION_DELIVERY_EVENTS = new Set([
  "bounced",
  "complained",
  "failed",
  "suppressed",
]);

export async function persistRecoveryMessageEvent(
  event: VerifiedResendWebhookEvent,
): Promise<PersistRecoveryMessageEventResult> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Recovery message event storage is not configured.");
  }

  const { data, error } = await supabase.rpc("record_recovery_message_event", {
    requested_event_type: event.eventType,
    requested_metadata: event.metadata,
    requested_occurred_at: event.occurredAt,
    requested_provider_event_id: event.providerEventId,
    requested_provider_event_type: event.providerEventType,
    requested_provider_message_id: event.providerMessageId,
    requested_should_suppress: event.shouldSuppressRecipient,
  });

  if (error) {
    throw new Error("Unable to store the recovery message event.");
  }

  if (
    !data ||
    typeof data !== "object" ||
    typeof data.inserted !== "boolean" ||
    typeof data.matched !== "boolean"
  ) {
    throw new Error("Recovery message event storage returned an invalid result.");
  }

  const result = { inserted: data.inserted, matched: data.matched };

  if (result.inserted && result.matched && ATTENTION_DELIVERY_EVENTS.has(event.eventType)) {
    const { data: message } = await supabase
      .from("recovery_messages")
      .select("failed_payment_id, user_id")
      .eq("provider_message_id", event.providerMessageId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ failed_payment_id: string; user_id: string }>();

    if (message) {
      await tryRecordPreviewRecoveryNotificationEvent({
        fingerprint: message.user_id,
        occurredAt: event.occurredAt,
        payload: {
          caseId: message.failed_payment_id,
          deliveryEvent: event.eventType,
          providerEventId: event.providerEventId,
        },
        ruleId: "attention_digest",
        userId: message.user_id,
      });
    }
  }

  return result;
}
