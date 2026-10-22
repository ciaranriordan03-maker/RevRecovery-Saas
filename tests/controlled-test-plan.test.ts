import { describe, expect, it } from "vitest";
import {
  evaluateControlledTestEligibility,
  getSyntheticTestCaseGateError,
  SYNTHETIC_TEST_CONFIRMATION,
} from "../app/lib/recovery/controlled-test-plan";

describe("controlled test eligibility", () => {
  it("requires a sandbox, Test mode, recipient, and valid email configuration", () => {
    const result = evaluateControlledTestEligibility({
      approvedTestRecipient: null,
      emailIdentityConfigured: false,
      livemode: true,
      mode: "live",
      recoveryConfigurationPersisted: true,
      stripeConnected: true,
    });

    expect(result.eligible).toBe(false);
    expect(result.checks.every((item) => !item.passed)).toBe(true);
  });

  it("permits eligibility only inside the complete sandbox safety boundary", () => {
    const result = evaluateControlledTestEligibility({
      approvedTestRecipient: "qa@example.com",
      emailIdentityConfigured: true,
      livemode: false,
      mode: "test",
      recoveryConfigurationPersisted: true,
      stripeConnected: true,
    });

    expect(result.eligible).toBe(true);
    expect(result.checks.every((item) => item.passed)).toBe(true);
  });

  it("rejects invalid test-recipient addresses", () => {
    const result = evaluateControlledTestEligibility({
      approvedTestRecipient: "not-an-email",
      emailIdentityConfigured: true,
      livemode: false,
      mode: "test",
      recoveryConfigurationPersisted: true,
      stripeConnected: true,
    });

    expect(result.eligible).toBe(false);
    expect(result.checks.find((item) => item.id === "test_recipient")?.passed).toBe(false);
  });

  it("requires both eligibility and explicit confirmation", () => {
    const eligible = evaluateControlledTestEligibility({
      approvedTestRecipient: "qa@example.com",
      emailIdentityConfigured: true,
      livemode: false,
      mode: "test",
      recoveryConfigurationPersisted: true,
      stripeConnected: true,
    });

    expect(getSyntheticTestCaseGateError({ confirmation: null, eligibility: eligible })).toContain(
      "Explicit confirmation",
    );
    expect(
      getSyntheticTestCaseGateError({
        confirmation: SYNTHETIC_TEST_CONFIRMATION,
        eligibility: eligible,
      }),
    ).toBeNull();
  });
});
