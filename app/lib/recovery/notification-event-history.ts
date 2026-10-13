import { ESSENTIAL_NOTIFICATION_RULES, type EssentialNotificationRule } from "./essential-notification-policy";

export type PreviewNotificationEvent = {
  cooldownUntil: string;
  id: string;
  occurredAt: string;
  reason: string;
  recipientEmail: string;
  severity: "critical" | "warning";
  title: string;
};

export type PreviewNotificationHistory = {
  events: PreviewNotificationEvent[];
  state: "ready" | "unavailable";
};

export type RecoveryNotificationEventRow = {
  cooldown_until: string;
  id: string;
  occurred_at: string;
  payload: unknown;
  recipient_email: string;
  rule_id: string;
  severity: string;
  status: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function buildReason(ruleId: EssentialNotificationRule["id"], payload: unknown) {
  const facts = isObject(payload) ? payload : {};

  if (ruleId === "webhook_failure") {
    const eventType = optionalString(facts, "eventType");
    return eventType
      ? `Stripe could not process an event of type ${eventType}.`
      : "Stripe event processing entered a failed state.";
  }

  if (ruleId === "sending_domain_failure") {
    const domain = optionalString(facts, "domain");
    const status = optionalString(facts, "status");
    return domain && status
      ? `${domain} changed to ${status}.`
      : "The customer-facing sending domain needs attention.";
  }

  const deliveryEvent = optionalString(facts, "deliveryEvent");
  return deliveryEvent
    ? `A recovery email recorded a ${deliveryEvent} delivery outcome.`
    : "A recovery case entered or changed within the needs-attention queue.";
}

export function mapPreviewNotificationEvent(
  row: RecoveryNotificationEventRow,
): PreviewNotificationEvent | null {
  const rule = ESSENTIAL_NOTIFICATION_RULES.find((candidate) => candidate.id === row.rule_id);
  if (!rule || row.status !== "recorded") return null;
  if (row.severity !== "critical" && row.severity !== "warning") return null;
  if (Number.isNaN(new Date(row.occurred_at).getTime())) return null;
  if (Number.isNaN(new Date(row.cooldown_until).getTime())) return null;

  return {
    cooldownUntil: row.cooldown_until,
    id: row.id,
    occurredAt: row.occurred_at,
    reason: buildReason(rule.id, row.payload),
    recipientEmail: row.recipient_email,
    severity: row.severity,
    title: rule.title,
  };
}
