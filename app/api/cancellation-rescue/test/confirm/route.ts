import { NextResponse } from "next/server";
import {
  hasCancellationTestRescueBodyWithinLimit,
  hasCancellationTestRescueJsonContentType,
  isCancellationTestRescueSameOrigin,
  readCancellationTestRescueBody,
} from "../../../../lib/cancellation-rescue/test-rescue-request";
import {
  CancellationTestRescueUnavailableError,
  confirmCancellationTestRescueToken,
  consumeCancellationTestRescueRateLimit,
} from "../../../../lib/server/cancellation-rescue-test-actions";
import { captureOperationalFailure } from "../../../../lib/server/operational-alerts";

export const runtime = "nodejs";

function privateJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
    status,
  });
}

export async function POST(request: Request) {
  if (!isCancellationTestRescueSameOrigin(request)) {
    return privateJson({ accepted: false }, 403);
  }
  if (!hasCancellationTestRescueJsonContentType(request)) {
    return privateJson({ accepted: false }, 415);
  }
  if (!hasCancellationTestRescueBodyWithinLimit(request)) {
    return privateJson({ accepted: false }, 413);
  }

  const body = await readCancellationTestRescueBody(request);
  if (!body.ok) {
    return privateJson({ accepted: false }, body.reason === "too_large" ? 413 : 400);
  }

  try {
    const withinRateLimit = await consumeCancellationTestRescueRateLimit({
      endpoint: "confirm",
      request,
    });
    if (!withinRateLimit) return privateJson({ accepted: false }, 429);

    const result = await confirmCancellationTestRescueToken(body.token);
    return privateJson(result, 202);
  } catch (error) {
    if (error instanceof CancellationTestRescueUnavailableError) {
      if (error.code === "stripe_outcome_unknown") {
        return privateJson({ accepted: true, status: "processing" }, 202);
      }
      if (error.code === "state_changed" || error.code === "token_unavailable") {
        return privateJson({ accepted: false }, 409);
      }
      if (error.code === "stripe_request_failed") {
        return privateJson({ accepted: false }, 503);
      }
    }

    captureOperationalFailure({
      code: "cancellation_test_rescue_failed",
      context: { stage: "processing" },
      error,
    });
    return privateJson({ accepted: false }, 503);
  }
}
