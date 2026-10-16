import { describe, expect, it } from "vitest";
import {
  evaluateRetryEmailOverlap,
  RETRY_EMAIL_REVIEW_WINDOW_MINUTES,
} from "../app/lib/recovery/retry-email-overlap";

describe("Stripe retry and recovery-email overlap", () => {
  it("requests review when an email is shortly before Stripe's retry", () => {
    const result = evaluateRetryEmailOverlap({
      nextEmailAt: "2026-10-15T06:00:00.000Z",
      nextPaymentAttemptAt: "2026-10-15T12:00:00.000Z",
    });

    expect(result).toMatchObject({
      distanceMinutes: 360,
      emailRelation: "before",
      status: "review",
    });
    expect(result.detail).toContain("6 hours before");
  });

  it("requests review at the inclusive 12-hour boundary", () => {
    const result = evaluateRetryEmailOverlap({
      nextEmailAt: "2026-10-15T00:00:00.000Z",
      nextPaymentAttemptAt: "2026-10-15T12:00:00.000Z",
    });

    expect(result.distanceMinutes).toBe(RETRY_EMAIL_REVIEW_WINDOW_MINUTES);
    expect(result.status).toBe("review");
  });

  it("reports clear timing outside the review window", () => {
    const result = evaluateRetryEmailOverlap({
      nextEmailAt: "2026-10-16T12:01:00.000Z",
      nextPaymentAttemptAt: "2026-10-16T00:00:00.000Z",
    });

    expect(result).toMatchObject({
      distanceMinutes: 721,
      emailRelation: "after",
      status: "clear",
    });
  });

  it("handles events scheduled at the same time", () => {
    const result = evaluateRetryEmailOverlap({
      nextEmailAt: "2026-10-16T00:00:00.000Z",
      nextPaymentAttemptAt: "2026-10-16T00:00:00.000Z",
    });

    expect(result.emailRelation).toBe("same_time");
    expect(result.detail).toContain("at the same time as");
  });

  it.each([
    { nextEmailAt: null, nextPaymentAttemptAt: "2026-10-16T00:00:00.000Z" },
    { nextEmailAt: "2026-10-16T00:00:00.000Z", nextPaymentAttemptAt: null },
    { nextEmailAt: "invalid", nextPaymentAttemptAt: "2026-10-16T00:00:00.000Z" },
  ])("does not infer overlap from incomplete timing facts", (input) => {
    expect(evaluateRetryEmailOverlap(input)).toMatchObject({
      distanceMinutes: null,
      emailRelation: null,
      status: "unavailable",
    });
  });
});
