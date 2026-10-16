import { describe, expect, it } from "vitest";
import { evaluateNotificationDeliveryGate } from "../app/lib/recovery/notification-delivery-policy";

const eligible = {
  accountEnabled: true,
  accountMode: "test" as const,
  approvedTestRecipient: "owner+alerts@example.com",
  deliveryEnabledSnapshot: true,
  eventRecipient: "owner+alerts@example.com",
  eventStatus: "queued",
  globalEnabled: true,
  sendingDomainStatus: "verified",
};

describe("notification test-delivery policy", () => {
  it("allows only a fully gated test delivery", () => {
    expect(evaluateNotificationDeliveryGate(eligible)).toEqual({
      allowed: true,
      recipient: "owner+alerts@example.com",
    });
  });

  it.each([
    ["globalEnabled", false, "global_disabled"],
    ["accountEnabled", false, "account_disabled"],
    ["accountMode", "disabled", "test_mode_required"],
    ["deliveryEnabledSnapshot", false, "delivery_snapshot_disabled"],
    ["eventStatus", "recorded", "event_not_queued"],
    ["sendingDomainStatus", "pending", "domain_unverified"],
    ["approvedTestRecipient", null, "test_recipient_missing"],
    ["eventRecipient", "customer@example.com", "recipient_mismatch"],
  ] as const)("blocks when %s is unsafe", (field, value, reason) => {
    expect(evaluateNotificationDeliveryGate({ ...eligible, [field]: value })).toEqual({
      allowed: false,
      reason,
    });
  });
});
