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
  deliveries: NotificationDeliveryReconciliation[];
  events: PreviewNotificationEvent[];
  state: "ready" | "unavailable";
};

export type NotificationDeliveryReconciliation = {
  detail: string;
  evidence: NotificationReconciliationEvidence;
  evidenceState: "ready" | "unavailable";
  id: string;
  occurredAt: string;
  recipientEmail: string;
  state: "attention_required" | "finalized" | "in_progress";
  statusLabel: string;
};

export type NotificationReconciliationEvidence = {
  attempts: Array<{
    occurredAt: string;
    outcome: string;
    reason: string;
  }>;
  authorization: null | {
    approvedAt: string | null;
    consumedAt: string | null;
    expiresAt: string;
    requestedAt: string;
    status: string;
  };
  reservation: {
    claimedAt: string | null;
    claimRecorded: boolean;
  };
  resolutionReview: NotificationResolutionReviewEvidence | null;
};

export type NotificationResolutionReviewEvidence = {
  audit: Array<{
    action: string;
    actorRole: "requester" | "reviewer" | "system";
    evidence: string;
    occurredAt: string;
  }>;
  decisionScope: string;
  evidenceSummary: string;
  expiresAt: string;
  requestedAt: string;
  requesterReviewerSeparated: boolean;
  reviewedAt: string | null;
  status: string;
};

export type NotificationResolutionRequestRow = {
  decision_scope: string;
  event_id: string;
  evidence_summary: string;
  expires_at: string;
  id: string;
  requested_at: string;
  requester_id: string;
  reviewed_at: string | null;
  reviewer_id: string | null;
  status: string;
};

export type NotificationResolutionRequestAuditRow = {
  action: string;
  actor_id: string;
  created_at: string;
  evidence_summary: string;
  request_id: string;
};

export const EMPTY_RECONCILIATION_EVIDENCE: NotificationReconciliationEvidence = {
  attempts: [],
  authorization: null,
  reservation: { claimedAt: null, claimRecorded: false },
  resolutionReview: null,
};

export function mapNotificationResolutionReview(
  request: NotificationResolutionRequestRow,
  audit: NotificationResolutionRequestAuditRow[],
): NotificationResolutionReviewEvidence | null {
  if (!request.id || !request.event_id || !request.requester_id) return null;
  if (Number.isNaN(new Date(request.requested_at).getTime())) return null;
  if (Number.isNaN(new Date(request.expires_at).getTime())) return null;

  return {
    audit: audit
      .filter((entry) => entry.request_id === request.id && !Number.isNaN(new Date(entry.created_at).getTime()))
      .map((entry) => ({
        action: entry.action,
        actorRole: entry.actor_id === request.requester_id
          ? "requester" as const
          : entry.actor_id === request.reviewer_id
            ? "reviewer" as const
            : "system" as const,
        evidence: entry.evidence_summary,
        occurredAt: entry.created_at,
      })),
    decisionScope: request.decision_scope,
    evidenceSummary: request.evidence_summary,
    expiresAt: request.expires_at,
    requestedAt: request.requested_at,
    requesterReviewerSeparated: Boolean(request.reviewer_id && request.reviewer_id !== request.requester_id),
    reviewedAt: request.reviewed_at,
    status: request.status,
  };
}

export type RecoveryNotificationEventRow = {
  claimed_at?: string | null;
  cooldown_until: string;
  id: string;
  occurred_at: string;
  payload: unknown;
  provider_accepted_at?: string | null;
  provider_message_id?: string | null;
  recipient_email: string;
  rule_id: string;
  severity: string;
  status: string;
  sent_at?: string | null;
  last_error?: string | null;
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

export function mapNotificationDeliveryReconciliation(
  row: RecoveryNotificationEventRow,
  now = new Date(),
): NotificationDeliveryReconciliation | null {
  if (!['accepted', 'failed', 'queued', 'sent'].includes(row.status)) return null;
  if (Number.isNaN(new Date(row.occurred_at).getTime())) return null;

  if (row.status === "sent") {
    return {
      detail: "Provider acceptance and database finalization are both recorded. No further delivery action is needed.",
      evidence: EMPTY_RECONCILIATION_EVIDENCE,
      evidenceState: "unavailable",
      id: row.id,
      occurredAt: row.sent_at ?? row.provider_accepted_at ?? row.occurred_at,
      recipientEmail: row.recipient_email,
      state: "finalized",
      statusLabel: "Finalized",
    };
  }

  if (row.status === "accepted") {
    return {
      detail: "The provider accepted this message, but database finalization is still pending. Do not resend it.",
      evidence: EMPTY_RECONCILIATION_EVIDENCE,
      evidenceState: "unavailable",
      id: row.id,
      occurredAt: row.provider_accepted_at ?? row.occurred_at,
      recipientEmail: row.recipient_email,
      state: "attention_required",
      statusLabel: "Needs reconciliation",
    };
  }

  if (row.status === "failed") {
    return {
      detail: row.last_error?.trim() || "The delivery attempt needs review before any new authorization is considered.",
      evidence: EMPTY_RECONCILIATION_EVIDENCE,
      evidenceState: "unavailable",
      id: row.id,
      occurredAt: row.occurred_at,
      recipientEmail: row.recipient_email,
      state: "attention_required",
      statusLabel: "Needs review",
    };
  }

  const claimedAt = row.claimed_at ? new Date(row.claimed_at) : new Date(row.occurred_at);
  const reservationIsStale = Number.isNaN(claimedAt.getTime()) ||
    now.getTime() - claimedAt.getTime() >= 15 * 60 * 1000;

  if (reservationIsStale) {
    return {
      detail: "This single-use reservation is older than its 15-minute authorization window. Review the audit trail; do not resend it.",
      evidence: EMPTY_RECONCILIATION_EVIDENCE,
      evidenceState: "unavailable",
      id: row.id,
      occurredAt: row.claimed_at ?? row.occurred_at,
      recipientEmail: row.recipient_email,
      state: "attention_required",
      statusLabel: "Stale reservation",
    };
  }

  return {
    detail: "A single-use reservation exists. Delivery state must be confirmed before any further action.",
    evidence: EMPTY_RECONCILIATION_EVIDENCE,
    evidenceState: "unavailable",
    id: row.id,
    occurredAt: row.occurred_at,
    recipientEmail: row.recipient_email,
    state: "in_progress",
    statusLabel: "Reserved",
  };
}
