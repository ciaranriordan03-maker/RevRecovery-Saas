import { createHash, randomBytes } from "node:crypto";

const TOKEN_BYTES = 32;
const TOKEN_PREFIX = "rrt_";
const TOKEN_PATTERN = /^rrt_[A-Za-z0-9_-]{43}$/;

export type CancellationTestRescueToken = {
  rawToken: string;
  tokenHash: string;
};

export function hashCancellationTestRescueToken(rawToken: string) {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function isCancellationTestRescueTokenCandidate(value: unknown): value is string {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}

export function createCancellationTestRescueToken(): CancellationTestRescueToken {
  const rawToken = `${TOKEN_PREFIX}${randomBytes(TOKEN_BYTES).toString("base64url")}`;

  return {
    rawToken,
    tokenHash: hashCancellationTestRescueToken(rawToken),
  };
}
