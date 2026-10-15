import "server-only";

import { ESSENTIAL_NOTIFICATION_RULES, type EssentialNotificationRule } from "../recovery/essential-notification-policy";
import { evaluateNotificationDeliveryGate } from "../recovery/notification-delivery-policy";
import { createSupabaseAdminClient } from "../supabase/admin";

const EVENTS_TABLE = "recovery_notification_events";
const ATTEMPTS_TABLE = "recovery_notification_delivery_attempts";

type DeliveryEventRow = {
  account_settings_id: string;
  claim_token: string | null;
  delivery_enabled_snapshot: boolean;
  id: string;
  payload: Record<string, unknown>;
  recipient_email: string;
  rule_id: EssentialNotificationRule["id"];
  status: string;
  user_id: string;
};

type DeliverySettingsRow = {
  essential_notification_test_recipient: string | null;
  essential_notifications_delivery_mode: "disabled" | "test";
  essential_notifications_enabled: boolean;
};

type SendingDomainRow = {
  domain: string;
  status: string;
};

export type NotificationDeliveryResult =
  | { outcome: "blocked"; reason: string }
  | { outcome: "failed"; reason: string }
  | { outcome: "sent"; providerMessageId: string | null };

function isGlobalDeliveryEnabled() {
  return process.env.ESSENTIAL_NOTIFICATION_DELIVERY_ENABLED === "true";
}

function getRule(ruleId: EssentialNotificationRule["id"]) {
  const rule = ESSENTIAL_NOTIFICATION_RULES.find((candidate) => candidate.id === ruleId);
  if (!rule) throw new Error("Essential notification rule is not configured.");
  return rule;
}

async function recordAttempt({
  event,
  outcome,
  reasonCode,
  recipientEmail,
  providerMessageId = null,
}: {
  event: DeliveryEventRow;
  outcome: "blocked" | "claimed" | "failed" | "sent";
  reasonCode: string;
  recipientEmail: string;
  providerMessageId?: string | null;
}) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return;

  await supabase.from(ATTEMPTS_TABLE).insert({
    event_id: event.id,
    outcome,
    provider_message_id: providerMessageId,
    reason_code: reasonCode,
    recipient_email: recipientEmail,
    user_id: event.user_id,
  });
}

async function sendTestNotification({
  domain,
  event,
  recipient,
}: {
  domain: string;
  event: DeliveryEventRow;
  recipient: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("resend_not_configured");

  const rule = getRule(event.rule_id);
  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from: `RevRecovery Alerts <notifications@${domain}>`,
      subject: `[TEST] RevRecovery: ${rule.title}`,
      text: [
        "This is a controlled RevRecovery test notification.",
        "No customer received this message.",
        "",
        rule.description,
        "",
        `Event reference: ${event.id}`,
      ].join("\n"),
      to: [recipient],
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `essential-notification/${event.id}`,
    },
    method: "POST",
  });

  if (!response.ok) throw new Error(`resend_http_${response.status}`);
  const body = (await response.json()) as { id?: string };
  return body.id ?? null;
}

export async function deliverQueuedTestNotification(
  eventId: string,
): Promise<NotificationDeliveryResult> {
  void eventId;
  return { outcome: "blocked", reason: "single_use_authorization_required" };
}

export async function deliverReservedTestNotification(
  eventId: string,
  claimToken: string,
): Promise<NotificationDeliveryResult> {
  if (process.env.ESSENTIAL_NOTIFICATION_AUTHORIZED_TEST_DELIVERY_ENABLED !== "true") {
    return { outcome: "blocked", reason: "authorized_test_delivery_disabled" };
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) return { outcome: "blocked", reason: "storage_unavailable" };

  const { data: event, error: eventError } = await supabase
    .from(EVENTS_TABLE)
    .select("id, user_id, account_settings_id, rule_id, status, recipient_email, delivery_enabled_snapshot, payload, claim_token")
    .eq("id", eventId)
    .maybeSingle<DeliveryEventRow>();
  if (eventError || !event) return { outcome: "blocked", reason: "event_unavailable" };
  if (event.claim_token !== claimToken || event.status !== "queued") {
    return { outcome: "blocked", reason: "reservation_mismatch" };
  }

  const [{ data: settings }, { data: domain }] = await Promise.all([
    supabase
      .from("recovery_account_settings")
      .select("essential_notifications_enabled, essential_notifications_delivery_mode, essential_notification_test_recipient")
      .eq("id", event.account_settings_id)
      .eq("user_id", event.user_id)
      .maybeSingle<DeliverySettingsRow>(),
    supabase
      .from("recovery_sending_domains")
      .select("domain, status")
      .eq("user_id", event.user_id)
      .maybeSingle<SendingDomainRow>(),
  ]);

  const decision = evaluateNotificationDeliveryGate({
    accountEnabled: settings?.essential_notifications_enabled === true,
    accountMode: settings?.essential_notifications_delivery_mode ?? "disabled",
    approvedTestRecipient: settings?.essential_notification_test_recipient ?? null,
    deliveryEnabledSnapshot: event.delivery_enabled_snapshot,
    eventRecipient: event.recipient_email,
    eventStatus: event.status,
    globalEnabled: isGlobalDeliveryEnabled(),
    sendingDomainStatus: domain?.status ?? null,
  });

  if (!decision.allowed) {
    await supabase
      .from(EVENTS_TABLE)
      .update({ claim_token: null, last_error: decision.reason, status: "failed" })
      .eq("id", event.id)
      .eq("claim_token", claimToken);
    await recordAttempt({
      event,
      outcome: "blocked",
      reasonCode: decision.reason,
      recipientEmail: event.recipient_email,
    });
    return { outcome: "blocked", reason: decision.reason };
  }

  if (!domain) return { outcome: "blocked", reason: "domain_unverified" };

  try {
    const providerMessageId = await sendTestNotification({
      domain: domain.domain,
      event,
      recipient: decision.recipient,
    });
    const { data: completed, error } = await supabase
      .from(EVENTS_TABLE)
      .update({
        claim_token: null,
        last_error: null,
        provider_message_id: providerMessageId,
        sent_at: new Date().toISOString(),
        status: "sent",
      })
      .eq("id", event.id)
      .eq("claim_token", claimToken)
      .select("id")
      .maybeSingle<{ id: string }>();
    if (error || !completed) throw new Error("delivery_completion_failed");

    await recordAttempt({
      event,
      outcome: "sent",
      providerMessageId,
      reasonCode: "authorized_test_notification_sent",
      recipientEmail: decision.recipient,
    });
    return { outcome: "sent", providerMessageId };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "notification_delivery_failed";
    await supabase
      .from(EVENTS_TABLE)
      .update({ claim_token: null, last_error: reason, status: "failed" })
      .eq("id", event.id)
      .eq("claim_token", claimToken);
    await recordAttempt({
      event,
      outcome: "failed",
      reasonCode: reason,
      recipientEmail: decision.recipient,
    });
    return { outcome: "failed", reason };
  }
}
