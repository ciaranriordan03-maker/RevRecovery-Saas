import type { NotificationDeliveryReconciliation } from "./notification-event-history";

export type NotificationReconciliationPlan = {
  allowedOutcome: string;
  prerequisites: string[];
  prohibitedActions: string[];
  summary: string;
  title: string;
};

export function buildNotificationReconciliationPlan(
  delivery: NotificationDeliveryReconciliation,
): NotificationReconciliationPlan | null {
  if (delivery.state !== "attention_required") return null;

  const prohibitedActions = [
    "Do not resend the notification.",
    "Do not create a replacement authorization yet.",
    "Do not clear or rewrite delivery evidence.",
  ];

  if (delivery.statusLabel === "Needs reconciliation") {
    return {
      allowedOutcome: "Finalize the existing accepted delivery only after its provider evidence matches exactly.",
      prerequisites: [
        "Confirm the provider message was accepted.",
        "Match the provider evidence to this exact event and recipient.",
        "Require a separate reviewed finalization action with an audit entry.",
      ],
      prohibitedActions,
      summary: "Provider acceptance is already recorded, so resolution must never contact the provider again.",
      title: "Accepted-delivery resolution plan",
    };
  }

  if (delivery.statusLabel === "Stale reservation") {
    return {
      allowedOutcome: "Quarantine the reservation until an operator can prove whether the provider was contacted.",
      prerequisites: [
        "Review the linked authorization and attempt ledger.",
        "Confirm the provider outcome from independent evidence.",
        "Require a separate reviewed resolution decision and audit entry.",
      ],
      prohibitedActions,
      summary: "A stale reservation has an uncertain outcome and must remain non-retryable until that uncertainty is resolved.",
      title: "Stale-reservation resolution plan",
    };
  }

  return {
    allowedOutcome: "Keep the event blocked until the failure is understood and confirmed as pre-provider.",
    prerequisites: [
      "Review the recorded failure and delivery-attempt evidence.",
      "Prove the provider did not accept the message.",
      "Require a new authorization only after a separate reviewed decision.",
    ],
    prohibitedActions,
    summary: "A failed state alone is not proof that sending is safe to repeat.",
    title: "Failed-delivery resolution plan",
  };
}
