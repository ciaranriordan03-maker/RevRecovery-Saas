import { describe, expect, it } from "vitest";
import {
  getWebhookClaimDisposition,
  getWebhookRetryDelaySeconds,
  sanitizeWebhookError,
} from "../app/lib/stripe/webhook-processing";

describe("Stripe webhook processing policy", () => {
  it("only treats completed outcomes as successful duplicates", () => {
    expect(getWebhookClaimDisposition("processed")).toBe("completed");
    expect(getWebhookClaimDisposition("ignored")).toBe("completed");
    expect(getWebhookClaimDisposition("processing")).toBe("in_progress");
    expect(getWebhookClaimDisposition("failed")).toBe("claimable_later");
    expect(getWebhookClaimDisposition("received")).toBe("claimable_later");
    expect(getWebhookClaimDisposition(null)).toBe("unknown");
  });

  it("uses bounded exponential backoff", () => {
    expect(getWebhookRetryDelaySeconds(1)).toBe(30);
    expect(getWebhookRetryDelaySeconds(2)).toBe(60);
    expect(getWebhookRetryDelaySeconds(3)).toBe(120);
    expect(getWebhookRetryDelaySeconds(20)).toBe(900);
  });

  it("stores only a stable code and error type", () => {
    const sanitized = sanitizeWebhookError(
      new Error("customer secret must never be persisted"),
    );

    expect(sanitized).toEqual({
      code: "WEBHOOK_PROCESSING_FAILED",
      details: { error_type: "Error" },
    });
    expect(JSON.stringify(sanitized)).not.toContain("customer secret");
  });
});
