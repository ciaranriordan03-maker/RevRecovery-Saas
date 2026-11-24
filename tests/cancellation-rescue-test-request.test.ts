import { describe, expect, it } from "vitest";
import {
  CANCELLATION_TEST_RESCUE_MAX_BODY_BYTES,
  getCancellationTestRescueRateLimitKey,
  hasCancellationTestRescueBodyWithinLimit,
  hasCancellationTestRescueJsonContentType,
  isCancellationTestRescueSameOrigin,
  readCancellationTestRescueBody,
} from "../app/lib/cancellation-rescue/test-rescue-request";

function request(body = '{"token":"rrt_example"}', headers: HeadersInit = {}) {
  return new Request("https://app.example.test/api/cancellation-rescue/test/preview", {
    body,
    headers: {
      "content-type": "application/json",
      origin: "https://app.example.test",
      "sec-fetch-site": "same-origin",
      ...headers,
    },
    method: "POST",
  });
}

describe("cancellation test rescue request boundary", () => {
  it("requires JSON plus explicit same-origin browser headers", () => {
    const valid = request();
    expect(hasCancellationTestRescueJsonContentType(valid)).toBe(true);
    expect(isCancellationTestRescueSameOrigin(valid)).toBe(true);

    expect(isCancellationTestRescueSameOrigin(request(undefined, { origin: "https://evil.test" }))).toBe(
      false,
    );
    expect(isCancellationTestRescueSameOrigin(request(undefined, { "sec-fetch-site": "cross-site" }))).toBe(
      false,
    );
    expect(isCancellationTestRescueSameOrigin(request(undefined, { "sec-fetch-site": "" }))).toBe(
      false,
    );
  });

  it("enforces declared and actual body-size limits", async () => {
    expect(
      hasCancellationTestRescueBodyWithinLimit(
        request(undefined, { "content-length": String(CANCELLATION_TEST_RESCUE_MAX_BODY_BYTES + 1) }),
      ),
    ).toBe(false);

    const oversized = request(
      JSON.stringify({ token: "x".repeat(CANCELLATION_TEST_RESCUE_MAX_BODY_BYTES) }),
    );
    await expect(readCancellationTestRescueBody(oversized)).resolves.toEqual({
      ok: false,
      reason: "too_large",
    });
  });

  it("parses only an object containing a token field", async () => {
    await expect(readCancellationTestRescueBody(request())).resolves.toEqual({
      ok: true,
      token: "rrt_example",
    });
    await expect(readCancellationTestRescueBody(request("[]"))).resolves.toEqual({
      ok: false,
      reason: "invalid_shape",
    });
    await expect(readCancellationTestRescueBody(request("not-json"))).resolves.toEqual({
      ok: false,
      reason: "invalid_json",
    });
  });

  it("uses a keyed, non-reversible request fingerprint for durable rate limits", () => {
    const source = request(undefined, {
      "user-agent": "Rescue Test Browser",
      "x-forwarded-for": "203.0.113.10",
    });
    const key = getCancellationTestRescueRateLimitKey({
      endpoint: "preview",
      request: source,
      secret: "a-secret-value-that-is-long-enough-for-tests",
    });

    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(key).not.toContain("203.0.113.10");
  });
});
