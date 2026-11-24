import { describe, expect, it } from "vitest";
import {
  createCancellationTestRescueToken,
  hashCancellationTestRescueToken,
  isCancellationTestRescueTokenCandidate,
} from "../app/lib/cancellation-rescue/test-rescue-token";

describe("cancellation test rescue tokens", () => {
  it("creates high-entropy opaque tokens and stores only a SHA-256 hash", () => {
    const first = createCancellationTestRescueToken();
    const second = createCancellationTestRescueToken();

    expect(first.rawToken).toMatch(/^rrt_[A-Za-z0-9_-]{43}$/);
    expect(first.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(first.tokenHash).toBe(hashCancellationTestRescueToken(first.rawToken));
    expect(first.tokenHash).not.toContain(first.rawToken);
    expect(second.rawToken).not.toBe(first.rawToken);
  });

  it("rejects malformed token candidates before database lookup", () => {
    expect(isCancellationTestRescueTokenCandidate("rrt_short")).toBe(false);
    expect(isCancellationTestRescueTokenCandidate(`live_${"a".repeat(43)}`)).toBe(false);
    expect(isCancellationTestRescueTokenCandidate(null)).toBe(false);
    expect(isCancellationTestRescueTokenCandidate(`rrt_${"a".repeat(43)}`)).toBe(true);
  });
});
