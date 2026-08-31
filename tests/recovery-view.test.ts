import { describe, expect, it } from "vitest";
import { buildRecoveryFlowView } from "../app/lib/recovery/recovery-view";
import { defaultUserSettings } from "../app/lib/settings";

describe("recovery flow view", () => {
  it("reflects persisted account settings and the worker schedule", () => {
    const view = buildRecoveryFlowView(
      {
        ...defaultUserSettings,
        email: {
          replyToEmail: "replies@example.com",
          senderName: "Example Billing",
          supportEmail: "support@example.com",
        },
        recovery: {
          ...defaultUserSettings.recovery,
          defaultEmailTone: "Professional",
        },
      },
      {
        approvedTestRecipient: "qa@example.com",
        connected: true,
        editable: true,
        livemode: false,
        mode: "test",
        scheduleId: "day_3_7",
        source: "persisted",
        stripeAccountId: "acct_test",
        timezone: "Europe/Dublin",
      },
    );

    expect(view).toMatchObject({
      approvedTestRecipient: "qa@example.com",
      environment: "Stripe sandbox data",
      mode: "test",
      replyToEmail: "replies@example.com",
      scheduleLabel: "Immediate, Day 3, Day 7",
      senderName: "Example Billing",
      supportEmail: "support@example.com",
      timezone: "Europe/Dublin",
      tone: "Professional",
    });
    expect(view.messages.map((message) => message.timing)).toEqual([
      "Immediately",
      "After 3 days",
      "After 7 days",
    ]);
    expect(view.messages[0].subject).toBe("Action needed: update your payment method");
  });

  it("does not claim an environment is active without a connection", () => {
    const view = buildRecoveryFlowView(defaultUserSettings, {
      approvedTestRecipient: null,
      connected: false,
      editable: false,
      livemode: null,
      mode: "off",
      scheduleId: "legacy_24_72",
      source: "not_connected",
      stripeAccountId: null,
      timezone: "UTC",
    });

    expect(view.environment).toBe("Not connected");
    expect(view.messages.map((message) => message.timing)).toEqual([
      "Immediately",
      "After 1 day",
      "After 3 days",
    ]);
  });
});
