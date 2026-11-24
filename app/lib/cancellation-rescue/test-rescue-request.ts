import { createHmac } from "node:crypto";

export const CANCELLATION_TEST_RESCUE_MAX_BODY_BYTES = 4096;

export type CancellationTestRescueBodyReadResult =
  | { ok: true; token: unknown }
  | {
      ok: false;
      reason: "invalid_json" | "invalid_shape" | "too_large";
    };

export function hasCancellationTestRescueJsonContentType(request: Request) {
  return request.headers.get("content-type")?.toLowerCase().startsWith("application/json") === true;
}

export function hasCancellationTestRescueBodyWithinLimit(request: Request) {
  const rawLength = request.headers.get("content-length");

  if (!rawLength) {
    return true;
  }

  const length = Number(rawLength);
  return Number.isSafeInteger(length) && length >= 0 && length <= CANCELLATION_TEST_RESCUE_MAX_BODY_BYTES;
}

export function isCancellationTestRescueSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");

  if (!origin || origin !== new URL(request.url).origin) {
    return false;
  }

  return fetchSite === "same-origin";
}

export async function readCancellationTestRescueBody(
  request: Request,
): Promise<CancellationTestRescueBodyReadResult> {
  const rawBody = await request.text();

  if (new TextEncoder().encode(rawBody).byteLength > CANCELLATION_TEST_RESCUE_MAX_BODY_BYTES) {
    return { ok: false, reason: "too_large" };
  }

  let body: unknown;

  try {
    body = JSON.parse(rawBody) as unknown;
  } catch {
    return { ok: false, reason: "invalid_json" };
  }

  if (!body || typeof body !== "object" || Array.isArray(body) || !("token" in body)) {
    return { ok: false, reason: "invalid_shape" };
  }

  return { ok: true, token: (body as { token: unknown }).token };
}

export function getCancellationTestRescueRateLimitKey({
  endpoint,
  request,
  secret,
}: {
  endpoint: "confirm" | "preview";
  request: Request;
  secret: string;
}) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const userAgent = request.headers.get("user-agent")?.slice(0, 256) ?? "unknown";

  return createHmac("sha256", secret)
    .update(`${endpoint}:${forwardedFor}:${userAgent}`, "utf8")
    .digest("hex");
}
