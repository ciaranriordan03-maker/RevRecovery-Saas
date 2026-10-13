import { describe, expect, it } from "vitest";
import { mapPreviewNotificationEvent } from "../app/lib/recovery/notification-event-history";

const baseRow = {
  cooldown_until: "2026-10-13T11:00:00.000Z",
  id: "event-1",
  occurred_at: "2026-10-13T10:00:00.000Z",
  recipient_email: "owner@example.com",
  severity: "critical",
  status: "recorded",
};

describe("preview notification event history", () => {
  it("maps a recorded Stripe failure without exposing raw error details", () => {
    expect(mapPreviewNotificationEvent({
      ...baseRow,
      payload: { errorCode: "internal_error", eventType: "invoice.payment_failed" },
      rule_id: "webhook_failure",
    })).toMatchObject({
      reason: "Stripe could not process an event of type invoice.payment_failed.",
      recipientEmail: "owner@example.com",
      title: "Stripe event processing failed",
    });
  });

  it("describes sending-domain and digest conditions from safe facts", () => {
    expect(mapPreviewNotificationEvent({
      ...baseRow,
      payload: { domain: "updates.example.com", status: "failed" },
      rule_id: "sending_domain_failure",
    })?.reason).toBe("updates.example.com changed to failed.");

    expect(mapPreviewNotificationEvent({
      ...baseRow,
      payload: { deliveryEvent: "bounced" },
      rule_id: "attention_digest",
      severity: "warning",
    })?.reason).toBe("A recovery email recorded a bounced delivery outcome.");
  });

  it("drops unknown, sent, or malformed records", () => {
    expect(mapPreviewNotificationEvent({ ...baseRow, payload: {}, rule_id: "unknown" })).toBeNull();
    expect(mapPreviewNotificationEvent({ ...baseRow, payload: {}, rule_id: "webhook_failure", status: "sent" })).toBeNull();
    expect(mapPreviewNotificationEvent({ ...baseRow, occurred_at: "invalid", payload: {}, rule_id: "webhook_failure" })).toBeNull();
  });
});
