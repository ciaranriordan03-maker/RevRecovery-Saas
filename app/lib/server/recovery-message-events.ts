import "server-only";

import { createSupabaseAdminClient } from "../supabase/admin";
import type { VerifiedResendWebhookEvent } from "./resend-webhooks";

export type PersistRecoveryMessageEventResult = {
  inserted: boolean;
  matched: boolean;
};

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

  return { inserted: data.inserted, matched: data.matched };
}
