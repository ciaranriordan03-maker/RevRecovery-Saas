import { describe, expect, it } from "vitest";
import { buildNotificationReconciliationPlan } from "../app/lib/recovery/notification-reconciliation-policy";
import { buildNotificationResolutionRequestPreview } from "../app/lib/recovery/notification-resolution-request-policy";
import type { NotificationDeliveryReconciliation } from "../app/lib/recovery/notification-event-history";

const delivery: NotificationDeliveryReconciliation = {
  detail: "Reservation is stale",
  evidence: { attempts: [], authorization: null, reservation: { claimedAt: null, claimRecorded: false } },
  evidenceState: "ready",
  id: "event-1",
  occurredAt: "2026-10-15T12:00:00.000Z",
  recipientEmail: "test@example.invalid",
  state: "attention_required",
  statusLabel: "Stale reservation",
};

describe("notification resolution request policy", () => {
  it("previews an expiring audit-only request for an attention-required delivery", () => {
    const preview = buildNotificationResolutionRequestPreview(delivery, buildNotificationReconciliationPlan(delivery));
    expect(preview?.title).toBe("Audit-only resolution request");
    expect(preview?.expiresAfter).toContain("15 minutes");
    expect(preview?.auditEffect).toContain("do not change");
    expect(preview?.evidenceRequired).toContain("Identify the reviewer independently from the requester.");
  });

  it("does not offer a request for finalized delivery", () => {
    const finalized = { ...delivery, state: "finalized" as const, statusLabel: "Finalized" };
    expect(buildNotificationResolutionRequestPreview(finalized, buildNotificationReconciliationPlan(finalized))).toBeNull();
  });
});
