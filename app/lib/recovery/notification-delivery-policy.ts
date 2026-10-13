export type NotificationDeliveryGateInput = {
  accountEnabled: boolean;
  accountMode: "disabled" | "test";
  approvedTestRecipient: string | null;
  deliveryEnabledSnapshot: boolean;
  eventRecipient: string;
  eventStatus: string;
  globalEnabled: boolean;
  sendingDomainStatus: string | null;
};

export type NotificationDeliveryGateDecision =
  | { allowed: true; recipient: string }
  | {
      allowed: false;
      reason:
        | "account_disabled"
        | "delivery_snapshot_disabled"
        | "domain_unverified"
        | "event_not_queued"
        | "global_disabled"
        | "recipient_mismatch"
        | "test_mode_required"
        | "test_recipient_missing";
    };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function evaluateNotificationDeliveryGate(
  input: NotificationDeliveryGateInput,
): NotificationDeliveryGateDecision {
  if (!input.globalEnabled) return { allowed: false, reason: "global_disabled" };
  if (!input.accountEnabled) return { allowed: false, reason: "account_disabled" };
  if (input.accountMode !== "test") return { allowed: false, reason: "test_mode_required" };
  if (!input.deliveryEnabledSnapshot) {
    return { allowed: false, reason: "delivery_snapshot_disabled" };
  }
  if (input.eventStatus !== "queued") return { allowed: false, reason: "event_not_queued" };
  if (input.sendingDomainStatus !== "verified") {
    return { allowed: false, reason: "domain_unverified" };
  }

  const approvedRecipient = normalizeEmail(input.approvedTestRecipient ?? "");
  if (!EMAIL_PATTERN.test(approvedRecipient)) {
    return { allowed: false, reason: "test_recipient_missing" };
  }
  if (normalizeEmail(input.eventRecipient) !== approvedRecipient) {
    return { allowed: false, reason: "recipient_mismatch" };
  }

  return { allowed: true, recipient: approvedRecipient };
}
