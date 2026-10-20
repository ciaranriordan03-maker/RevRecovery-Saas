import { describe, expect, it } from "vitest";
import {
  formatDeliveryPreflight,
  inspectDeliveryPreflight,
} from "../scripts/delivery-preflight.mjs";

const safeEnvironment = {
  CRON_SECRET: "cron-secret-value-that-is-long-enough",
  ESSENTIAL_NOTIFICATION_AUTHORIZED_TEST_DELIVERY_ENABLED: "false",
  ESSENTIAL_NOTIFICATION_DELIVERY_ENABLED: "false",
  NEXT_PUBLIC_APP_URL: "https://preview.example.com",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    "sb_publishable_example_value_that_is_long_enough",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  RECOVERY_DELIVERY_ENABLED: "false",
  RECOVERY_DELIVERY_KILL_SWITCH: "true",
  RECOVERY_EMAIL_CRON_SECRET: "recovery-cron-secret-that-is-long-enough",
  RECOVERY_EMAIL_FROM: "RevRecovery <recoveries@example.com>",
  RESEND_API_KEY: "re_example_key",
  RESEND_WEBHOOK_SECRET: "whsec_resend_example",
  STRIPE_CONNECT_CLIENT_ID: "ca_example",
  STRIPE_SECRET_KEY: "sk_test_example_key",
  STRIPE_TOKEN_ENCRYPTION_KEY:
    "dedicated-stripe-token-key-with-more-than-thirty-two-characters",
  STRIPE_WEBHOOK_SECRET: "whsec_stripe_example",
  SUPABASE_SECRET_KEY: "sb_secret_example_value_that_is_long_enough",
};

describe("redacted delivery preflight", () => {
  it("passes only when required configuration exists and delivery is explicitly off", () => {
    const report = inspectDeliveryPreflight(safeEnvironment);

    expect(report.configurationPassed).toBe(true);
    expect(report.gatesPassed).toBe(true);
    expect(report.passed).toBe(true);
    expect(formatDeliveryPreflight(report)).toContain("RESULT PASS");
  });

  it("never includes configuration values in its report or formatted output", () => {
    const report = inspectDeliveryPreflight(safeEnvironment);
    const serializedEvidence = `${JSON.stringify(report)}\n${formatDeliveryPreflight(report)}`;

    const deliveryFlagKeys = new Set([
      "ESSENTIAL_NOTIFICATION_AUTHORIZED_TEST_DELIVERY_ENABLED",
      "ESSENTIAL_NOTIFICATION_DELIVERY_ENABLED",
      "RECOVERY_DELIVERY_ENABLED",
      "RECOVERY_DELIVERY_KILL_SWITCH",
    ]);

    for (const [key, value] of Object.entries(safeEnvironment)) {
      if (deliveryFlagKeys.has(key)) continue;
      expect(serializedEvidence).not.toContain(value);
    }
  });

  it("fails safely when flags are missing or malformed", () => {
    const report = inspectDeliveryPreflight({
      ...safeEnvironment,
      ESSENTIAL_NOTIFICATION_DELIVERY_ENABLED: "FALSE",
      RECOVERY_DELIVERY_ENABLED: undefined,
      RECOVERY_DELIVERY_KILL_SWITCH: undefined,
    });

    expect(report.gatesPassed).toBe(false);
    expect(report.passed).toBe(false);
    expect(report.gates[0]).toMatchObject({
      passed: false,
      states: { delivery: "missing", killSwitch: "missing" },
    });
    expect(report.gates[1]).toMatchObject({
      passed: false,
      states: { delivery: "invalid" },
    });
  });

  it("rejects enabled customer-contact gates", () => {
    const report = inspectDeliveryPreflight({
      ...safeEnvironment,
      ESSENTIAL_NOTIFICATION_AUTHORIZED_TEST_DELIVERY_ENABLED: "true",
      ESSENTIAL_NOTIFICATION_DELIVERY_ENABLED: "true",
      RECOVERY_DELIVERY_ENABLED: "true",
      RECOVERY_DELIVERY_KILL_SWITCH: "false",
    });

    expect(report.gatesPassed).toBe(false);
    expect(report.gates.every((gate) => !gate.passed)).toBe(true);
    expect(formatDeliveryPreflight(report)).toContain("RESULT FAIL");
  });

  it("requires a dedicated Stripe token encryption key", () => {
    const report = inspectDeliveryPreflight({
      ...safeEnvironment,
      STRIPE_TOKEN_ENCRYPTION_KEY: "",
    });
    const tokenKey = report.configuration.find(
      (item) => item.key === "STRIPE_TOKEN_ENCRYPTION_KEY",
    );

    expect(tokenKey?.status).toBe("missing");
    expect(report.passed).toBe(false);
  });

  it("rejects reuse of the Supabase credential as the Stripe token key", () => {
    const report = inspectDeliveryPreflight({
      ...safeEnvironment,
      STRIPE_TOKEN_ENCRYPTION_KEY: safeEnvironment.SUPABASE_SECRET_KEY,
    });
    const separation = report.configuration.find(
      (item) => item.key === "STRIPE_TOKEN_ENCRYPTION_KEY_SEPARATION",
    );

    expect(separation?.status).toBe("invalid");
    expect(report.passed).toBe(false);
  });
});
