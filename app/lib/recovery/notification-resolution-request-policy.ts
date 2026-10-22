import type { NotificationDeliveryReconciliation } from "./notification-event-history";
import type { NotificationReconciliationPlan } from "./notification-reconciliation-policy";

export type NotificationResolutionRequestPreview = {
  auditEffect: string;
  decisionScope: string;
  evidenceRequired: string[];
  expiresAfter: string;
  title: string;
};

export function buildNotificationResolutionRequestPreview(
  delivery: NotificationDeliveryReconciliation,
  plan: NotificationReconciliationPlan | null,
): NotificationResolutionRequestPreview | null {
  if (delivery.state !== "attention_required" || !plan) return null;

  return {
    auditEffect: "Record a proposed resolution request for separate review; do not change the reservation, authorization, event, or delivery attempt.",
    decisionScope: plan.allowedOutcome,
    evidenceRequired: [
      ...plan.prerequisites,
      "Identify the reviewer independently from the requester.",
      "Record an expiry so an unattended request cannot remain actionable.",
    ],
    expiresAfter: "15 minutes after a future request is created",
    title: "Audit-only resolution request",
  };
}
