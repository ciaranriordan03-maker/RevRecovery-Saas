import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_VERSION = 1;
const MAX_TOKEN_LIFETIME_SECONDS = 60 * 60 * 24 * 30;

export type RetentionLinkClaims = {
  caseId: string;
  expiresAt: number;
  version: number;
};

function encodeClaims(claims: RetentionLinkClaims) {
  return Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
}

function signPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

export function createRetentionLinkToken({
  caseId,
  expiresAt,
  now = Math.floor(Date.now() / 1000),
  secret,
}: {
  caseId: string;
  expiresAt: number;
  now?: number;
  secret: string;
}) {
  if (!isUuid(caseId)) {
    throw new Error("A valid retention case ID is required.");
  }

  if (!secret.trim() || secret.length < 32) {
    throw new Error("Retention link secret must be at least 32 characters.");
  }

  if (
    !Number.isInteger(expiresAt) ||
    expiresAt <= now ||
    expiresAt - now > MAX_TOKEN_LIFETIME_SECONDS
  ) {
    throw new Error("Retention link expiry must be within the next 30 days.");
  }

  const payload = encodeClaims({
    caseId,
    expiresAt,
    version: TOKEN_VERSION,
  });

  return `${payload}.${signPayload(payload, secret)}`;
}

export function verifyRetentionLinkToken({
  now = Math.floor(Date.now() / 1000),
  secret,
  token,
}: {
  now?: number;
  secret: string;
  token: string;
}): RetentionLinkClaims | null {
  if (!secret.trim() || secret.length < 32) {
    return null;
  }

  const [payload, providedSignature, ...extra] = token.split(".");
  if (!payload || !providedSignature || extra.length > 0) {
    return null;
  }

  const expectedSignature = signPayload(payload, secret);
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const providedBuffer = Buffer.from(providedSignature, "utf8");

  if (
    expectedBuffer.length !== providedBuffer.length ||
    !timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    return null;
  }

  try {
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<RetentionLinkClaims>;

    if (
      claims.version !== TOKEN_VERSION ||
      !isUuid(claims.caseId) ||
      !Number.isInteger(claims.expiresAt) ||
      (claims.expiresAt as number) <= now
    ) {
      return null;
    }

    return claims as RetentionLinkClaims;
  } catch {
    return null;
  }
}
