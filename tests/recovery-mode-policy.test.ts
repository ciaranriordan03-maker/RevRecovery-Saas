import { describe, expect, it } from "vitest";
import {
  evaluateRecoveryDeliveryEnvironment,
  getEnvironmentFlagState,
  isEnvironmentFlagEnabled,
} from "../app/lib/recovery/environment-policy";
import {
  canScheduleRecoveryMessages,
  getRecoveryModeInputError,
  getRecoveryDeliveryRecipient,
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

  it("parses environment flags only from explicit lowercase booleans", () => {
    expect(getEnvironmentFlagState(" true ")).toBe("enabled");
    expect(getEnvironmentFlagState("false")).toBe("disabled");
    expect(getEnvironmentFlagState(undefined)).toBe("missing");
    expect(getEnvironmentFlagState("TRUE")).toBe("invalid");
    expect(getEnvironmentFlagState("1")).toBe("invalid");
    expect(isEnvironmentFlagEnabled("true")).toBe(true);
    expect(isEnvironmentFlagEnabled("TRUE")).toBe(false);
  });

  it("fails recovery delivery closed unless enablement and kill-switch state are both explicit", () => {
    expect(
      evaluateRecoveryDeliveryEnvironment({
        deliveryEnabled: undefined,
        killSwitch: undefined,
      }),
    ).toMatchObject({
      allowed: false,
      deliveryEnabledState: "missing",
      killSwitchState: "missing",
      reason: "kill_switch_not_explicitly_disabled",
    });
    expect(
      evaluateRecoveryDeliveryEnvironment({
        deliveryEnabled: "true",
        killSwitch: "true",
      }),
    ).toMatchObject({ allowed: false, reason: "kill_switch_enabled" });
    expect(
      evaluateRecoveryDeliveryEnvironment({
        deliveryEnabled: "false",
        killSwitch: "false",
      }),
    ).toMatchObject({ allowed: false, reason: "delivery_disabled" });
    expect(
      evaluateRecoveryDeliveryEnvironment({
        deliveryEnabled: "TRUE",
        killSwitch: "false",
      }),
    ).toMatchObject({
      allowed: false,
      reason: "delivery_not_explicitly_enabled",
    });
    expect(
      evaluateRecoveryDeliveryEnvironment({
        deliveryEnabled: "true",
        killSwitch: "false",
      }),
    ).toMatchObject({ allowed: true, reason: "enabled" });
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
