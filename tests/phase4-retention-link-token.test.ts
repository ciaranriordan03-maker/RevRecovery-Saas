import { describe, expect, it } from "vitest";
import {
  createRetentionLinkToken,
  verifyRetentionLinkToken,
} from "../app/lib/retention/link-token";

const caseId = "123e4567-e89b-42d3-a456-426614174000";
const now = 1_800_000_000;
const secret = "a-secure-retention-link-secret-with-32-chars";

describe("Phase 4 signed retention links", () => {
  it("round-trips a time-limited case claim", () => {
    const token = createRetentionLinkToken({
      caseId,
      expiresAt: now + 3_600,
      now,
      secret,
    });

    expect(verifyRetentionLinkToken({ now, secret, token })).toEqual({
      caseId,
      expiresAt: now + 3_600,
      version: 1,
    });
  });

  it("rejects tampered, expired, and incorrectly signed links", () => {
    const token = createRetentionLinkToken({
      caseId,
      expiresAt: now + 60,
      now,
      secret,
    });

    expect(
      verifyRetentionLinkToken({ now, secret, token: `${token}x` }),
    ).toBeNull();
    expect(
      verifyRetentionLinkToken({ now: now + 60, secret, token }),
    ).toBeNull();
    expect(
      verifyRetentionLinkToken({
        now,
        secret: "a-different-retention-link-secret-32chars",
        token,
      }),
    ).toBeNull();
  });

  it("limits links to 30 days and requires a strong secret", () => {
    expect(() =>
      createRetentionLinkToken({
        caseId,
        expiresAt: now + 60 * 60 * 24 * 31,
        now,
        secret,
      }),
    ).toThrow("within the next 30 days");

    expect(() =>
      createRetentionLinkToken({
        caseId,
        expiresAt: now + 60,
        now,
        secret: "short",
      }),
    ).toThrow("at least 32 characters");
  });
});
