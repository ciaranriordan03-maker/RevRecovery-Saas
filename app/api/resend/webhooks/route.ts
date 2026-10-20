import { NextResponse } from "next/server";
import { captureOperationalFailure } from "../../../lib/server/operational-alerts";
import { persistRecoveryMessageEvent } from "../../../lib/server/recovery-message-events";
import {
  ResendWebhookValidationError,
  verifyAndNormalizeResendWebhook,
} from "../../../lib/server/resend-webhooks";

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) {
    captureOperationalFailure({
      code: "resend_webhook_failed",
      context: { stage: "configuration" },
      error: new Error("ResendWebhookConfigurationError"),
    });
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 500 });
  }

  const payload = await request.text();

  let event;
  try {
    event = verifyAndNormalizeResendWebhook({
      headers: request.headers,
      payload,
      secret,
    });
  } catch (error) {
    if (error instanceof ResendWebhookValidationError) {
      return NextResponse.json({ error: "Invalid webhook." }, { status: 400 });
    }
    throw error;
  }

  try {
    const result = await persistRecoveryMessageEvent(event);
    return NextResponse.json({
      duplicate: !result.inserted,
      matched: result.matched,
      received: true,
    });
  } catch (error) {
    captureOperationalFailure({
      code: "resend_webhook_failed",
      context: { stage: "persistence" },
      error,
    });
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
