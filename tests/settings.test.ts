import { describe, expect, it } from "vitest";
import {
  defaultUserSettings,
  getUserSettingsValidationError,
  mergeUserSettings,
} from "../app/lib/settings";

describe("user settings", () => {
  it("uses RevRecovery for new sender settings", () => {
    expect(defaultUserSettings.email.senderName).toBe("RevRecovery");
  });

  it("adds default recovery copy when loading legacy settings", () => {
    const settings = mergeUserSettings({
      recovery: {
        defaultEmailTone: "Professional",
        paymentRetryAttempts: "3 retries",
        prioritizeHighValueCustomers: true,
        sendingSchedule: "Immediate, Day 3, Day 7",
      } as typeof defaultUserSettings.recovery,
    });

    expect(settings.recovery.messageTemplates).toHaveLength(3);
    expect(settings.recovery.messageTemplates[0]).toMatchObject({
      messageKey: "email_1",
      subject: "Action needed: update your payment method",
    });
  });

  it("preserves customized recovery email copy", () => {
    const templates = defaultUserSettings.recovery.messageTemplates.map(
      (template, index) => ({
        ...template,
        bodyPreview: `Custom message ${index + 1}`,
        subject: `Custom subject ${index + 1}`,
      }),
    );
    const settings = mergeUserSettings({
      email: {
        replyToEmail: "replies@example.com",
        senderName: "RevRecovery",
        supportEmail: "support@example.com",
      },
      recovery: {
        ...defaultUserSettings.recovery,
        messageTemplates: templates,
      },
    });

    expect(settings.recovery.messageTemplates).toEqual(templates);
    expect(getUserSettingsValidationError(settings)).toBeNull();
  });

  it("upgrades the legacy RecoverFlow sender name without replacing custom names", () => {
    expect(
      mergeUserSettings({
        email: {
          ...defaultUserSettings.email,
          senderName: "RecoverFlow Team",
        },
      }).email.senderName,
    ).toBe("RevRecovery");

    expect(
      mergeUserSettings({
        email: {
          ...defaultUserSettings.email,
          senderName: "Acme Billing",
        },
      }).email.senderName,
    ).toBe("Acme Billing");
  });

  it("removes the legacy fictional team without replacing real members", () => {
    const legacy = mergeUserSettings({
      team: [
        { id: "one", accent: "primary", canRemove: false, email: "sarah@acme.com", initials: "SC", name: "Sarah Chen", role: "Owner" },
        { id: "two", accent: "purple", canRemove: true, email: "michael@acme.com", initials: "MJ", name: "Michael Johnson", role: "Admin" },
        { id: "three", accent: "success", canRemove: true, email: "emma@acme.com", initials: "EP", name: "Emma Park", role: "Member" },
      ],
    });
    const real = mergeUserSettings({
      team: [
        { id: "owner", accent: "primary", canRemove: false, email: "owner@revrecovery.io", initials: "CR", name: "Ciaran Riordan", role: "Owner" },
      ],
    });

    expect(legacy.team).toEqual([]);
    expect(real.team).toHaveLength(1);
    expect(real.team[0]?.email).toBe("owner@revrecovery.io");
  });

  it("trims valid email settings before saving", () => {
    const settings = mergeUserSettings({
      email: {
        ...defaultUserSettings.email,
        replyToEmail: " billing@example.com ",
        supportEmail: " support@example.com ",
      },
    });

    expect(settings.email.replyToEmail).toBe("billing@example.com");
    expect(settings.email.supportEmail).toBe("support@example.com");
    expect(getUserSettingsValidationError(settings)).toBeNull();
  });

  it("rejects malformed support and reply-to addresses", () => {
    const invalidSupport = mergeUserSettings({
      email: {
        ...defaultUserSettings.email,
        supportEmail: "support@example.com.",
      },
    });
    const invalidReplyTo = mergeUserSettings({
      email: {
        ...defaultUserSettings.email,
        replyToEmail: "billing@example.com.",
        supportEmail: "support@example.com",
      },
    });

    expect(getUserSettingsValidationError(invalidSupport)).toBe(
      "Support email must be a valid email address.",
    );
    expect(getUserSettingsValidationError(invalidReplyTo)).toBe(
      "Reply-to email must be a valid email address.",
    );
  });

  it("requires a sender name", () => {
    const settings = {
      ...defaultUserSettings,
      email: {
        replyToEmail: "billing@example.com",
        senderName: "   ",
        supportEmail: "support@example.com",
      },
    };

    expect(getUserSettingsValidationError(settings)).toBe(
      "Sender name is required.",
    );
  });

  it("rejects recovery copy containing a merchant-supplied URL", () => {
    const settings = mergeUserSettings({
      email: {
        replyToEmail: "replies@example.com",
        senderName: "RevRecovery",
        supportEmail: "support@example.com",
      },
      recovery: {
        ...defaultUserSettings.recovery,
        messageTemplates: defaultUserSettings.recovery.messageTemplates.map(
          (template, index) =>
            index === 0
              ? {
                  ...template,
                  bodyPreview: "Pay at https://example.com instead.",
                }
              : template,
        ),
      },
    });

    expect(getUserSettingsValidationError(settings)).toBe(
      "Recovery email 1 cannot include a URL. RevRecovery adds the secure payment link automatically.",
    );
  });
});
