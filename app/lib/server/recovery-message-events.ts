import "server-only";

import { createSupabaseAdminClient } from "../supabase/admin";
import type { VerifiedResendWebhookEvent } from "./resend-webhooks";

type RecoveryMessageOwner = {
  id: string;
  user_id: string;
};

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

  const { data: message, error: lookupError } = await supabase
    .from("recovery_messages")
    .select("id, user_id")
    .eq("provider_message_id", event.providerMessageId)
    .maybeSingle<RecoveryMessageOwner>();

  if (lookupError) {
    throw new Error("Unable to match the recovery message event.");
  }

  const { error: insertError } = await supabase.from("recovery_message_events").insert({
    event_type: event.eventType,
    metadata: {},
    occurred_at: event.occurredAt,
    provider: "resend",
    provider_event_id: event.providerEventId,
    provider_event_type: event.providerEventType,
    provider_message_id: event.providerMessageId,
    recovery_message_id: message?.id ?? null,
    user_id: message?.user_id ?? null,
  });

  if (insertError?.code === "23505") {
    return { inserted: false, matched: Boolean(message) };
  }

  if (insertError) {
    throw new Error("Unable to store the recovery message event.");
  }

  return { inserted: true, matched: Boolean(message) };
}
