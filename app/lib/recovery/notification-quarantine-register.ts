import type { NotificationDeliveryReconciliation } from "./notification-event-history";

export type NotificationQuarantineRegisterEntry = {
  ageLabel: string;
  appliedAt: string;
  decisionScope: string;
  evidenceComplete: boolean;
  eventId: string;
  independentReviewConfirmed: boolean;
  integrityIssues: string[];
  integrityStatus: "attention_required" | "verified";
  recipientEmail: string;
};

export type NotificationQuarantineRegister = {
  completeEvidenceCount: number;
  entries: NotificationQuarantineRegisterEntry[];
  integrityIssueCount: number;
  oldestAgeLabel: string | null;
  total: number;
  verifiedIntegrityCount: number;
};

function formatAge(appliedAt: string, now: Date) {
  const elapsedMs = Math.max(0, now.getTime() - new Date(appliedAt).getTime());
  const elapsedHours = Math.floor(elapsedMs / (60 * 60 * 1000));
  if (elapsedHours < 1) return "Less than 1 hour";
  if (elapsedHours < 24) return `${elapsedHours} ${elapsedHours === 1 ? "hour" : "hours"}`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  return `${elapsedDays} ${elapsedDays === 1 ? "day" : "days"}`;
}

function inspectEvidenceIntegrity(delivery: NotificationDeliveryReconciliation) {
  const review = delivery.evidence.resolutionReview;
  const quarantine = delivery.evidence.quarantine;
  const issues: string[] = [];

  if (!review) return ["The linked resolution-review record is missing."];
  if (!quarantine) return ["The final quarantine record is missing."];
  if (!review.requesterReviewerSeparated) issues.push("Independent requester and reviewer identities are not confirmed.");
  if (review.status !== "quarantined") issues.push("The resolution-review status does not match the final quarantine state.");
  if (review.decisionScope !== quarantine.decisionScope) issues.push("The approved decision scope does not match the applied quarantine scope.");

  const requested = review.audit.filter((entry) => entry.action === "requested");
  const approved = review.audit.filter((entry) => entry.action === "approved");
  const quarantined = review.audit.filter((entry) => entry.action === "quarantined");
  if (requested.length !== 1) issues.push("The audit ledger must contain exactly one request entry.");
  if (approved.length !== 1) issues.push("The audit ledger must contain exactly one approval entry.");
  if (quarantined.length !== 1) issues.push("The audit ledger must contain exactly one quarantine entry.");

  if (requested.length === 1 && approved.length === 1 && quarantined.length === 1) {
    const requestedAt = new Date(requested[0].occurredAt).getTime();
    const approvedAt = new Date(approved[0].occurredAt).getTime();
    const quarantinedAt = new Date(quarantined[0].occurredAt).getTime();
    if (requestedAt > approvedAt || approvedAt > quarantinedAt) issues.push("Audit timestamps are not in request, approval, quarantine order.");
    if (quarantinedAt !== new Date(quarantine.appliedAt).getTime()) issues.push("The final quarantine timestamp differs from the immutable audit entry.");
    if (quarantined[0].evidence !== quarantine.evidenceSummary) issues.push("The final quarantine evidence differs from the immutable audit entry.");
  }

  return issues;
}

export function buildNotificationQuarantineRegister(
  deliveries: NotificationDeliveryReconciliation[],
  now = new Date(),
): NotificationQuarantineRegister {
  const entries = deliveries
    .flatMap((delivery): NotificationQuarantineRegisterEntry[] => {
      const quarantine = delivery.evidence.quarantine;
      if (!quarantine || Number.isNaN(new Date(quarantine.appliedAt).getTime())) return [];
      const integrityIssues = inspectEvidenceIntegrity(delivery);

      return [{
        ageLabel: formatAge(quarantine.appliedAt, now),
        appliedAt: quarantine.appliedAt,
        decisionScope: quarantine.decisionScope,
        evidenceComplete: integrityIssues.length === 0,
        eventId: delivery.id,
        independentReviewConfirmed: Boolean(delivery.evidence.resolutionReview?.requesterReviewerSeparated),
        integrityIssues,
        integrityStatus: integrityIssues.length === 0 ? "verified" : "attention_required",
        recipientEmail: delivery.recipientEmail,
      }];
    })
    .sort((left, right) => new Date(right.appliedAt).getTime() - new Date(left.appliedAt).getTime());

  const oldest = entries.at(-1);
  return {
    completeEvidenceCount: entries.filter((entry) => entry.evidenceComplete).length,
    entries,
    integrityIssueCount: entries.reduce((total, entry) => total + entry.integrityIssues.length, 0),
    oldestAgeLabel: oldest?.ageLabel ?? null,
    total: entries.length,
    verifiedIntegrityCount: entries.filter((entry) => entry.integrityStatus === "verified").length,
  };
}
