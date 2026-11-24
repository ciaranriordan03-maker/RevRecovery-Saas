import { NextResponse } from "next/server";
import {
  hasCancellationTestRescueBodyWithinLimit,
  hasCancellationTestRescueJsonContentType,
  isCancellationTestRescueSameOrigin,
  readCancellationTestRescueBody,
} from "../../../../lib/cancellation-rescue/test-rescue-request";
import {
  consumeCancellationTestRescueRateLimit,
  previewCancellationTestRescueToken,
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
    return privateJson({ available: false }, 403);
  }
  if (!hasCancellationTestRescueJsonContentType(request)) {
    return privateJson({ available: false }, 415);
  }
  if (!hasCancellationTestRescueBodyWithinLimit(request)) {
    return privateJson({ available: false }, 413);
  }

  const body = await readCancellationTestRescueBody(request);
  if (!body.ok) {
    return privateJson({ available: false }, body.reason === "too_large" ? 413 : 400);
  }

  try {
    const withinRateLimit = await consumeCancellationTestRescueRateLimit({
      endpoint: "preview",
      request,
    });
    if (!withinRateLimit) return privateJson({ available: false }, 429);

    const preview = await previewCancellationTestRescueToken(body.token);
    if (!preview) return privateJson({ available: false });

    return privateJson({
      available: true,
      expiresAt: preview.expiresAt,
      scheduledEndAt: preview.scheduledEndAt,
    });
  } catch (error) {
    captureOperationalFailure({
      code: "cancellation_test_rescue_failed",
      context: { stage: "processing" },
      error,
    });
    return privateJson({ available: false }, 503);
  }
}
