import { describe, expect, it } from "vitest";
import { buildNotificationActivationReview } from "../app/lib/recovery/notification-activation-review";

const safeEvidence = {
  accountEnabled: false,
  accountMode: "disabled" as const,
  approvedRecipient: "owner+revrecovery-dev@example.com",
  blockedDrill: {
    eventId: "event-1",
    eventSent: false,
    outcome: "blocked",
    providerMessageId: null,
    reason: "global_disabled",
  },
  globalEnabled: false,
  sendingDomain: "notifications.example.com",
  sendingDomainStatus: "verified",
};

describe("notification activation review", () => {
  it("recognizes complete evidence while keeping delivery unauthorized", () => {
    const review = buildNotificationActivationReview(safeEvidence);

    expect(review.readyForAuthorizationReview).toBe(true);
    expect(review.conclusion).toBe("not_authorized");
    expect(review.checks).toHaveLength(6);
    expect(review.checks.every((check) => check.status === "confirmed")).toBe(true);
  });

  it("rejects a drill that reached a provider", () => {
    const review = buildNotificationActivationReview({
      ...safeEvidence,
      blockedDrill: {
        ...safeEvidence.blockedDrill,
        providerMessageId: "provider-message-1",
      },
    });

    expect(review.readyForAuthorizationReview).toBe(false);
    expect(review.checks.find((check) => check.id === "blocked_drill")?.status).toBe("missing");
  });

  it("requires delivery gates and mode to remain disabled before review", () => {
    const review = buildNotificationActivationReview({
      ...safeEvidence,
      accountEnabled: true,
      accountMode: "test",
      globalEnabled: true,
    });

    expect(review.readyForAuthorizationReview).toBe(false);
    expect(review.checks.filter((check) => check.status === "missing").map((check) => check.id)).toEqual([
      "global_gate",
      "account_gate",
      "delivery_mode",
    ]);
  });
});
