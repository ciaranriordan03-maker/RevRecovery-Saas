import { describe, expect, it } from "vitest";
import { mapNotificationDeliveryReconciliation } from "../app/lib/recovery/notification-event-history";

const baseRow = {
  cooldown_until: "2026-10-16T12:00:00.000Z",
  id: "event-1",
  occurred_at: "2026-10-15T12:00:00.000Z",
  payload: {},
  recipient_email: "test@example.invalid",
  rule_id: "webhook_failure",
  severity: "critical",
  status: "recorded",
};

describe("notification delivery reconciliation", () => {
  it("marks provider-accepted events as attention required and explicitly prevents resend", () => {
    expect(mapNotificationDeliveryReconciliation({
      ...baseRow,
      provider_accepted_at: "2026-10-15T12:01:00.000Z",
      status: "accepted",
    })).toMatchObject({
      state: "attention_required",
      statusLabel: "Needs reconciliation",
      detail: expect.stringContaining("Do not resend"),
    });
  });

  it("marks sent events as finalized", () => {
    expect(mapNotificationDeliveryReconciliation({
      ...baseRow,
      sent_at: "2026-10-15T12:02:00.000Z",
      status: "sent",
    })).toMatchObject({ state: "finalized", statusLabel: "Finalized" });
  });

  it("keeps recorded preview events out of reconciliation", () => {
    expect(mapNotificationDeliveryReconciliation(baseRow)).toBeNull();
  });
});
