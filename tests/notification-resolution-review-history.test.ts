import { describe, expect, it } from "vitest";
import { mapNotificationQuarantine, mapNotificationResolutionReview } from "../app/lib/recovery/notification-event-history";

const request = {
  decision_scope: "quarantine_only",
  event_id: "event-1",
  evidence_summary: "Independent evidence was checked.",
  expires_at: "2026-10-15T16:15:00.000Z",
  id: "request-1",
  requested_at: "2026-10-15T16:00:00.000Z",
  requester_id: "requester-1",
  reviewed_at: "2026-10-15T16:02:00.000Z",
  reviewer_id: "reviewer-1",
  status: "approved",
};

describe("notification resolution review history", () => {
  it("maps separate requester and reviewer evidence without exposing identity IDs", () => {
    const result = mapNotificationResolutionReview(request, [
      { action: "requested", actor_id: "requester-1", created_at: "2026-10-15T16:00:00.000Z", evidence_summary: "Requested quarantine review.", request_id: "request-1" },
      { action: "approved", actor_id: "reviewer-1", created_at: "2026-10-15T16:02:00.000Z", evidence_summary: "Approved quarantine only.", request_id: "request-1" },
    ]);

    expect(result).toMatchObject({
      decisionScope: "quarantine_only",
      requesterReviewerSeparated: true,
      status: "approved",
    });
    expect(result?.audit.map((entry) => entry.actorRole)).toEqual(["requester", "reviewer"]);
    expect(JSON.stringify(result)).not.toContain("requester-1");
    expect(JSON.stringify(result)).not.toContain("reviewer-1");
  });

  it("ignores unrelated audit rows and reports missing independent review", () => {
    const result = mapNotificationResolutionReview({ ...request, reviewer_id: null, reviewed_at: null, status: "pending" }, [
      { action: "requested", actor_id: "requester-1", created_at: "2026-10-15T16:00:00.000Z", evidence_summary: "Requested.", request_id: "request-1" },
      { action: "approved", actor_id: "other", created_at: "2026-10-15T16:01:00.000Z", evidence_summary: "Unrelated.", request_id: "request-2" },
    ]);

    expect(result?.requesterReviewerSeparated).toBe(false);
    expect(result?.audit).toHaveLength(1);
  });

  it("rejects malformed request timestamps", () => {
    expect(mapNotificationResolutionReview({ ...request, requested_at: "invalid" }, [])).toBeNull();
  });

  it("maps quarantine evidence to a reviewer role without exposing identity IDs", () => {
    const result = mapNotificationQuarantine({
      applied_by: "reviewer-1",
      created_at: "2026-10-15T16:32:00.000Z",
      decision_scope: "quarantine_only",
      event_id: "event-1",
      evidence_summary: "Reviewed quarantine applied once.",
      id: "quarantine-1",
      resolution_request_id: "request-1",
    }, request);

    expect(result).toMatchObject({
      appliedByRole: "reviewer",
      decisionScope: "quarantine_only",
      evidenceSummary: "Reviewed quarantine applied once.",
    });
    expect(JSON.stringify(result)).not.toContain("reviewer-1");
  });

  it("reports only the database-side checkpoint comparison result", () => {
    const quarantine = {
      applied_by: "reviewer-1",
      created_at: "2026-10-15T16:32:00.000Z",
      decision_scope: "quarantine_only",
      event_id: "event-1",
      evidence_summary: "Reviewed quarantine applied once.",
      id: "quarantine-1",
      resolution_request_id: "request-1",
    };
    const checkpoint = {
      canonical_version: 1,
      created_at: "2026-10-15T16:32:01.000Z",
      evidence_fingerprint: "stored-fingerprint",
      quarantine_id: "quarantine-1",
    };

    const verified = mapNotificationQuarantine(quarantine, request, checkpoint, "stored-fingerprint");
    const changed = mapNotificationQuarantine(quarantine, request, checkpoint, "different-fingerprint");

    expect(verified?.checkpoint).toMatchObject({ canonicalVersion: 1, status: "verified" });
    expect(changed?.checkpoint?.status).toBe("changed");
    expect(JSON.stringify(verified)).not.toContain("stored-fingerprint");
  });

  it("rejects malformed quarantine evidence", () => {
    expect(mapNotificationQuarantine({
      applied_by: "reviewer-1",
      created_at: "invalid",
      decision_scope: "quarantine_only",
      event_id: "event-1",
      evidence_summary: "Reviewed.",
      id: "quarantine-1",
      resolution_request_id: "request-1",
    }, request)).toBeNull();
  });
});
