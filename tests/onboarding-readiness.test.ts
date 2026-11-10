import { describe, expect, it } from "vitest";
import {
  clampOnboardingStep,
  evaluateOnboardingReadiness,
} from "../app/lib/onboarding/readiness";

describe("onboarding readiness", () => {
  it("requires a Stripe connection and valid customer email identity", () => {
    const result = evaluateOnboardingReadiness({
      emailIdentityConfigured: false,
      stripeConnected: false,
    });

    expect(result.ready).toBe(false);
    expect(result.checks.map((check) => check.id)).toEqual([
      "stripe_connection",
      "email_identity",
    ]);
    expect(result.checks.every((check) => !check.complete)).toBe(true);
  });

  it("is ready without requiring delivery to be enabled", () => {
    const result = evaluateOnboardingReadiness({
      emailIdentityConfigured: true,
      stripeConnected: true,
    });

    expect(result.ready).toBe(true);
    expect(result.checks.every((check) => check.complete)).toBe(true);
  });

  it("prevents a direct URL from skipping an incomplete Stripe step", () => {
    const readiness = evaluateOnboardingReadiness({
      emailIdentityConfigured: true,
      stripeConnected: false,
    });

    expect(clampOnboardingStep("Success", readiness)).toBe("Connect Stripe");
  });

  it("allows email setup after Stripe and later steps only after email setup", () => {
    const needsEmail = evaluateOnboardingReadiness({
      emailIdentityConfigured: false,
      stripeConnected: true,
    });
    const ready = evaluateOnboardingReadiness({
      emailIdentityConfigured: true,
      stripeConnected: true,
    });

    expect(clampOnboardingStep("Success", needsEmail)).toBe("Email Setup");
    expect(clampOnboardingStep("Success", ready)).toBe("Success");
  });
});
