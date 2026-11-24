import { isCancellationTestEmailDevelopment } from "../../../../lib/cancellation-rescue/test-email-policy";
import { recordCancellationResendTestEvidence } from "../../../../lib/server/cancellation-rescue-resend-evidence";
import { readCancellationTestEmailWebhookBody } from "../../../../lib/server/cancellation-test-email-webhook-body";
import { createSupabaseAdminClient } from "../../../../lib/supabase/admin";
import { getSupabaseUrl } from "../../../../lib/supabase/env";

export const runtime = "nodejs";

function response(status: number) {
  return Response.json({ received: status === 200 }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function canReceive() {
  if (process.env.CANCELLATION_TEST_EMAIL_WEBHOOK_ENABLED !== "true") return false;
  try {
    return isCancellationTestEmailDevelopment({
      supabaseUrl: getSupabaseUrl(),
      vercelEnvironment: process.env.VERCEL_ENV,
      vercelTarget: process.env.VERCEL_TARGET_ENV,
    });
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!canReceive()) return response(404);
  const signingSecret = process.env.CANCELLATION_TEST_EMAIL_WEBHOOK_SECRET?.trim();
  if (!signingSecret || signingSecret === process.env.RESEND_WEBHOOK_SECRET?.trim()) {
    return response(404);
  }
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return response(415);
  }

  const body = await readCancellationTestEmailWebhookBody(request);
  if ("error" in body) return response(body.error);
  try {
    const outcome = await recordCancellationResendTestEvidence({
      headers: request.headers,
      payload: body.payload,
      signingSecret,
      db: {
        async rpc(name, args) {
          const client = createSupabaseAdminClient();
          if (!client) throw new Error("Cancellation test evidence storage is unavailable.");
          return await client.rpc(name, args);
        },
      },
    });
    // Don't disclose whether the signed event matched, conflicted, or was a replay.
    return response(outcome === "invalid" ? 400 : 200);
  } catch {
    return response(503);
  }
}
