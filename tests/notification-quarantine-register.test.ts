import { describe, expect, it } from "vitest";
import { buildNotificationQuarantineRegister } from "../app/lib/recovery/notification-quarantine-register";
import type { NotificationDeliveryReconciliation } from "../app/lib/recovery/notification-event-history";

function delivery(overrides: Partial<NotificationDeliveryReconciliation> = {}): NotificationDeliveryReconciliation {
  return {
    detail: "Quarantined.",
    evidence: {
      attempts: [],
      authorization: null,
      quarantine: {
        appliedAt: "2026-10-15T12:00:00.000Z",
        appliedByRole: "reviewer",
        decisionScope: "quarantine_only",
        evidenceSummary: "Applied once.",
        resolutionRequestId: "request-1",
      },
      reservation: { claimedAt: "2026-10-13T12:00:00.000Z", claimRecorded: true },
      resolutionReview: {
        audit: [
          { action: "requested", actorRole: "requester", evidence: "Requested.", occurredAt: "2026-10-15T11:55:00.000Z" },
          { action: "approved", actorRole: "reviewer", evidence: "Approved.", occurredAt: "2026-10-15T11:58:00.000Z" },
          { action: "quarantined", actorRole: "reviewer", evidence: "Applied.", occurredAt: "2026-10-15T12:00:00.000Z" },
        ],
        decisionScope: "quarantine_only",
        evidenceSummary: "Reviewed.",
        expiresAt: "2026-10-15T12:10:00.000Z",
        requestedAt: "2026-10-15T11:55:00.000Z",
        requesterReviewerSeparated: true,
        reviewedAt: "2026-10-15T11:58:00.000Z",
        status: "quarantined",
      },
    },
    evidenceState: "ready",
    id: "event-1",
    occurredAt: "2026-10-13T12:00:00.000Z",
    recipientEmail: "test@example.invalid",
    state: "finalized",
    statusLabel: "Quarantined",
    ...overrides,
  };
}

describe("notification quarantine register", () => {
  it("summarizes complete quarantine evidence and age", () => {
    const register = buildNotificationQuarantineRegister(
      [delivery()],
      new Date("2026-10-15T16:30:00.000Z"),
    );

    expect(register).toMatchObject({
      completeEvidenceCount: 1,
      oldestAgeLabel: "4 hours",
      total: 1,
    });
    expect(register.entries[0]).toMatchObject({
      decisionScope: "quarantine_only",
      evidenceComplete: true,
      independentReviewConfirmed: true,
    });
  });

  it("excludes deliveries without a valid quarantine record", () => {
    const notQuarantined = delivery({
      evidence: {
        ...delivery().evidence,
        quarantine: null,
      },
    });

    expect(buildNotificationQuarantineRegister([notQuarantined]).entries).toEqual([]);
  });

  it("flags missing independent audit evidence", () => {
    const incomplete = delivery();
    incomplete.evidence.resolutionReview = {
      ...incomplete.evidence.resolutionReview!,
      audit: incomplete.evidence.resolutionReview!.audit.slice(0, 1),
      requesterReviewerSeparated: false,
    };

    const register = buildNotificationQuarantineRegister([incomplete]);
    expect(register.completeEvidenceCount).toBe(0);
    expect(register.entries[0].evidenceComplete).toBe(false);
  });
});
