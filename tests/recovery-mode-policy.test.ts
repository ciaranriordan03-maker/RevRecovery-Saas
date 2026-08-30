import { describe, expect, it } from "vitest";
import {
  canScheduleRecoveryMessages,
  getRecoveryModeInputError,
  getRecoveryDeliveryRecipient,
  isRecoveryDeliveryKillSwitchEnabled,
  isRecoveryMode,
  normalizeApprovedTestRecipient,
} from "../app/lib/recovery/mode-policy";

describe("recovery mode policy", () => {
  it("recognizes only supported persisted modes", () => {
    expect(["off", "test", "live", "paused"].every(isRecoveryMode)).toBe(true);
    expect(isRecoveryMode("enabled")).toBe(false);
    expect(isRecoveryMode(null)).toBe(false);
  });

  it("retains scheduled outreach while paused but not while off", () => {
    expect(canScheduleRecoveryMessages("off")).toBe(false);
    expect(canScheduleRecoveryMessages("paused")).toBe(true);
    expect(canScheduleRecoveryMessages("test")).toBe(true);
    expect(canScheduleRecoveryMessages("live")).toBe(true);
  });

  it("routes test delivery only to the approved test recipient", () => {
    expect(
      getRecoveryDeliveryRecipient({
        approvedTestRecipient: " approved@example.com ",
        customerRecipient: "customer@example.com",
        mode: "test",
      }),
    ).toBe("approved@example.com");
  });

  it("routes live delivery to the Stripe customer", () => {
    expect(
      getRecoveryDeliveryRecipient({
        approvedTestRecipient: "approved@example.com",
        customerRecipient: " customer@example.com ",
        mode: "live",
      }),
    ).toBe("customer@example.com");
    expect(
      getRecoveryDeliveryRecipient({
        approvedTestRecipient: "approved@example.com",
        customerRecipient: "customer@example.com",
        mode: "paused",
      }),
    ).toBeNull();
  });

  it("enables the emergency kill switch only for an explicit true value", () => {
    expect(isRecoveryDeliveryKillSwitchEnabled(" true ")).toBe(true);
    expect(isRecoveryDeliveryKillSwitchEnabled("TRUE")).toBe(true);
    expect(isRecoveryDeliveryKillSwitchEnabled("1")).toBe(false);
    expect(isRecoveryDeliveryKillSwitchEnabled(undefined)).toBe(false);
  });

  it("normalizes an explicitly approved test recipient", () => {
    expect(normalizeApprovedTestRecipient(" TEST@Example.com ")).toBe(
      "test@example.com",
    );
    expect(normalizeApprovedTestRecipient("  ")).toBeNull();
    expect(normalizeApprovedTestRecipient(42)).toBeNull();
  });

  it("requires a valid approved recipient only in test mode", () => {
    expect(
      getRecoveryModeInputError({
        approvedTestRecipient: null,
        mode: "test",
      }),
    ).toBe("Test mode requires an approved test recipient.");
    expect(
      getRecoveryModeInputError({
        approvedTestRecipient: "not-an-email",
        mode: "test",
      }),
    ).toBe("Enter a valid approved test recipient.");
    expect(
      getRecoveryModeInputError({
        approvedTestRecipient: "approved@example.com",
        mode: "test",
      }),
    ).toBeNull();
    expect(
      getRecoveryModeInputError({
        approvedTestRecipient: null,
        mode: "paused",
      }),
    ).toBeNull();
  });
});
