import { describe, expect, it } from "vitest";
import { getWebhookEnvironmentDisposition } from "../app/lib/stripe/webhook-environment";

describe("Stripe webhook environment isolation", () => {
  it("processes matching live and sandbox events", () => {
    expect(getWebhookEnvironmentDisposition(true, true)).toBe("process");
    expect(getWebhookEnvironmentDisposition(false, false)).toBe("process");
  });

  it("rejects events from the opposite Stripe environment", () => {
    expect(getWebhookEnvironmentDisposition(true, false)).toBe(
      "stripe_environment_mismatch",
    );
    expect(getWebhookEnvironmentDisposition(false, true)).toBe(
      "stripe_environment_mismatch",
    );
  });

  it("does not process missing or unclassified connections", () => {
    expect(getWebhookEnvironmentDisposition(undefined, true)).toBe(
      "connected_account_not_found",
    );
    expect(getWebhookEnvironmentDisposition(null, false)).toBe(
      "connected_account_environment_unknown",
    );
  });
});
