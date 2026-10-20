import { NextResponse } from "next/server";
import { isRecoveryCronAuthorized } from "../../../lib/server/cron-authorization";
import { captureOperationalFailure } from "../../../lib/server/operational-alerts";
import { processPendingRecoveryMessages } from "../../../lib/server/recovery-delivery";

export const runtime = "nodejs";

async function processRecoveryRequest(request: Request) {
  if (!isRecoveryCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawLimit = Number(searchParams.get("limit") ?? "25");
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 25;

  try {
    const result = await processPendingRecoveryMessages(limit);
    return NextResponse.json(result);
  } catch (error) {
    captureOperationalFailure({
      code: "recovery_cron_failed",
      context: { batchLimit: limit, stage: "processing" },
      error,
    });
    return NextResponse.json(
      { error: "Recovery processing failed." },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return processRecoveryRequest(request);
}

export async function POST(request: Request) {
  return processRecoveryRequest(request);
}
