import type { NotificationDeliveryReconciliation } from "./notification-event-history";

export type NotificationQuarantineRegisterEntry = {
  ageLabel: string;
  appliedAt: string;
  decisionScope: string;
  evidenceComplete: boolean;
  eventId: string;
  independentReviewConfirmed: boolean;
  recipientEmail: string;
};

export type NotificationQuarantineRegister = {
  completeEvidenceCount: number;
  entries: NotificationQuarantineRegisterEntry[];
  oldestAgeLabel: string | null;
  total: number;
};

function formatAge(appliedAt: string, now: Date) {
  const elapsedMs = Math.max(0, now.getTime() - new Date(appliedAt).getTime());
  const elapsedHours = Math.floor(elapsedMs / (60 * 60 * 1000));
  if (elapsedHours < 1) return "Less than 1 hour";
  if (elapsedHours < 24) return `${elapsedHours} ${elapsedHours === 1 ? "hour" : "hours"}`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  return `${elapsedDays} ${elapsedDays === 1 ? "day" : "days"}`;
}

function hasCompleteEvidence(delivery: NotificationDeliveryReconciliation) {
  const review = delivery.evidence.resolutionReview;
  if (!review?.requesterReviewerSeparated || !delivery.evidence.quarantine) return false;

  const actions = new Set(review.audit.map((entry) => entry.action));
  return actions.has("requested") && actions.has("approved") && actions.has("quarantined");
}

export function buildNotificationQuarantineRegister(
  deliveries: NotificationDeliveryReconciliation[],
  now = new Date(),
): NotificationQuarantineRegister {
  const entries = deliveries
    .flatMap((delivery): NotificationQuarantineRegisterEntry[] => {
      const quarantine = delivery.evidence.quarantine;
      if (!quarantine || Number.isNaN(new Date(quarantine.appliedAt).getTime())) return [];

      return [{
        ageLabel: formatAge(quarantine.appliedAt, now),
        appliedAt: quarantine.appliedAt,
        decisionScope: quarantine.decisionScope,
        evidenceComplete: hasCompleteEvidence(delivery),
        eventId: delivery.id,
        independentReviewConfirmed: Boolean(delivery.evidence.resolutionReview?.requesterReviewerSeparated),
        recipientEmail: delivery.recipientEmail,
      }];
    })
    .sort((left, right) => new Date(right.appliedAt).getTime() - new Date(left.appliedAt).getTime());

  const oldest = entries.at(-1);
  return {
    completeEvidenceCount: entries.filter((entry) => entry.evidenceComplete).length,
    entries,
    oldestAgeLabel: oldest?.ageLabel ?? null,
    total: entries.length,
  };
}
