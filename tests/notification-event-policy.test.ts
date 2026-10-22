import { describe, expect, it } from "vitest";
import { buildRecoveryNotificationEventDraft } from "../app/lib/recovery/notification-event-policy";

describe("notification event policy", () => {
  it("creates a delivery-disabled hourly webhook event bucket", () => {
    const draft = buildRecoveryNotificationEventDraft({
      fingerprint: "Stripe Event evt_123",
      occurredAt: "2026-10-12T20:12:34.000Z",
      recipientEmail: "owner@example.com",
      ruleId: "webhook_failure",
    });

    expect(draft.deliveryEnabledSnapshot).toBe(false);
    expect(draft.status).toBe("recorded");
    expect(draft.cooldownUntil).toBe("2026-10-12T21:12:34.000Z");
    expect(draft.deduplicationKey).toBe(
      "webhook_failure:stripe-event-evt_123:2026-10-12T20:00:00.000Z",
    );
  });

  it("uses a daily bucket for digest and sending-domain rules", () => {
    for (const ruleId of ["attention_digest", "sending_domain_failure"] as const) {
      const draft = buildRecoveryNotificationEventDraft({
        fingerprint: "account_123",
        occurredAt: "2026-10-12T20:12:34.000Z",
        recipientEmail: "owner@example.com",
        ruleId,
      });
      expect(draft.cooldownUntil).toBe("2026-10-13T20:12:34.000Z");
      expect(draft.deduplicationKey).toContain("2026-10-12T00:00:00.000Z");
    }
  });

  it("rejects invalid timestamps and empty fingerprints", () => {
    expect(() => buildRecoveryNotificationEventDraft({
      fingerprint: "account_123",
      occurredAt: "invalid",
      recipientEmail: "owner@example.com",
      ruleId: "webhook_failure",
    })).toThrow("Notification event time is invalid.");
    expect(() => buildRecoveryNotificationEventDraft({
      fingerprint: " ",
      occurredAt: "2026-10-12T20:12:34.000Z",
      recipientEmail: "owner@example.com",
      ruleId: "webhook_failure",
    })).toThrow("Notification fingerprint is required.");
  });
});
