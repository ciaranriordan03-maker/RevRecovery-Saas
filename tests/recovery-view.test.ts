import { describe, expect, it } from "vitest";
import {
  buildRecoveryFlowView,
  buildRecoveryStatusSummary,
} from "../app/lib/recovery/recovery-view";
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
      scheduleId: "day_3_7",
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

  it("shows persisted recovery email copy in the review screen", () => {
    const customTemplates = defaultUserSettings.recovery.messageTemplates.map(
      (template, index) => ({
        ...template,
        bodyPreview: `Saved body ${index + 1}`,
        subject: `Saved subject ${index + 1}`,
      }),
    );
    const view = buildRecoveryFlowView(
      {
        ...defaultUserSettings,
        recovery: {
          ...defaultUserSettings.recovery,
          messageTemplates: customTemplates,
        },
      },
      {
        approvedTestRecipient: null,
        connected: true,
        editable: true,
        livemode: true,
        mode: "live",
        scheduleId: "day_3_7",
        source: "persisted",
        stripeAccountId: "acct_live",
        timezone: "Europe/Dublin",
      },
    );

    expect(view.messages.map(({ bodyPreview, subject }) => ({ bodyPreview, subject }))).toEqual(
      customTemplates.map(({ bodyPreview, subject }) => ({ bodyPreview, subject })),
    );
  });
});

describe("recovery status summary", () => {
  const connectedSettings = {
    approvedTestRecipient: "qa@example.com",
    connected: true,
    editable: true,
    livemode: true,
    mode: "live" as const,
    scheduleId: "day_3_7" as const,
    source: "persisted" as const,
    stripeAccountId: "acct_live",
    timezone: "Europe/Dublin",
  };

  it("uses the persisted mode and schedule for live recovery", () => {
    const summary = buildRecoveryStatusSummary(connectedSettings);

    expect(summary.title).toBe("Recovery is set up and live");
    expect(summary.description).toContain("immediate, day 3, day 7");
    expect(summary.timings).toEqual(["Immediately", "After 3 days", "After 7 days"]);
  });

  it.each([
    ["test", "Recovery test mode is set up"],
    ["paused", "Recovery is safely paused"],
    ["off", "Recovery monitoring is off"],
  ] as const)("uses truthful wording for %s mode", (mode, title) => {
    expect(buildRecoveryStatusSummary({ ...connectedSettings, mode }).title).toBe(title);
  });

  it("does not claim recovery is active without Stripe", () => {
    const summary = buildRecoveryStatusSummary({
      ...connectedSettings,
      connected: false,
      editable: false,
      livemode: null,
      mode: "off",
      source: "not_connected",
      stripeAccountId: null,
    });

    expect(summary.title).toBe("Connect Stripe to finish recovery setup");
  });
});
