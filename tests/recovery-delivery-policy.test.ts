import { describe, expect, it } from "vitest";
import {
  classifyDeliveryHttpFailure,
  getRecoveryDeliveryNextAttemptAt,
  getRecoveryDeliveryRetryDelaySeconds,
  shouldRetryRecoveryDelivery,
} from "../app/lib/recovery/delivery-policy";

describe("recovery delivery retry policy", () => {
  it("uses bounded exponential backoff", () => {
    expect(getRecoveryDeliveryRetryDelaySeconds(1)).toBe(60);
    expect(getRecoveryDeliveryRetryDelaySeconds(2)).toBe(120);
    expect(getRecoveryDeliveryRetryDelaySeconds(5)).toBe(960);
    expect(getRecoveryDeliveryRetryDelaySeconds(20)).toBe(21_600);
    expect(
      getRecoveryDeliveryNextAttemptAt(2, new Date("2026-08-30T10:00:00Z")),
    ).toBe("2026-08-30T10:02:00.000Z");
  });

  it("retries transient provider responses and stops on terminal responses", () => {
    expect(classifyDeliveryHttpFailure(429)).toBe("retryable");
    expect(classifyDeliveryHttpFailure(503)).toBe("retryable");
    expect(classifyDeliveryHttpFailure(401)).toBe("terminal");
    expect(shouldRetryRecoveryDelivery("retryable", 4)).toBe(true);
    expect(shouldRetryRecoveryDelivery("retryable", 5)).toBe(false);
    expect(shouldRetryRecoveryDelivery("terminal", 1)).toBe(false);
  });
});
