import { describe, expect, it } from "vitest";
import { buildNotificationReconciliationPlan } from "../app/lib/recovery/notification-reconciliation-policy";
import type { NotificationDeliveryReconciliation } from "../app/lib/recovery/notification-event-history";

const baseDelivery: NotificationDeliveryReconciliation = {
  detail: "Needs attention",
  evidence: { attempts: [], authorization: null, reservation: { claimedAt: null, claimRecorded: false }, resolutionReview: null },
  evidenceState: "ready",
  id: "event-1",
  occurredAt: "2026-10-15T12:00:00.000Z",
  recipientEmail: "test@example.invalid",
  state: "attention_required",
  statusLabel: "Stale reservation",
};

describe("notification reconciliation policy", () => {
  it("quarantines a stale reservation without permitting retry", () => {
    const plan = buildNotificationReconciliationPlan(baseDelivery);
    expect(plan?.title).toBe("Stale-reservation resolution plan");
    expect(plan?.allowedOutcome).toContain("Quarantine");
    expect(plan?.prohibitedActions).toContain("Do not resend the notification.");
  });

  it("allows only provider-free finalization for an accepted delivery", () => {
    const plan = buildNotificationReconciliationPlan({ ...baseDelivery, statusLabel: "Needs reconciliation" });
    expect(plan?.allowedOutcome).toContain("Finalize the existing accepted delivery");
    expect(plan?.summary).toContain("never contact the provider again");
  });

  it("does not create a resolution plan for completed delivery", () => {
    expect(buildNotificationReconciliationPlan({ ...baseDelivery, state: "finalized", statusLabel: "Finalized" })).toBeNull();
  });
});
