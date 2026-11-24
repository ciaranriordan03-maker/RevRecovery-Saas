import { NextResponse } from "next/server";
import { processCancellationReconciliation } from "../../../lib/server/cancellation-reconciliation";
import { isRecoveryCronAuthorized } from "../../../lib/server/cron-authorization";
import { captureOperationalFailure } from "../../../lib/server/operational-alerts";

export const runtime = "nodejs";
export const maxDuration = 300;

async function reconcile(request: Request) {
  if (!isRecoveryCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await processCancellationReconciliation());
  } catch (error) {
    captureOperationalFailure({
      code: "recovery_cron_failed",
      context: { stage: "reconciliation" },
      error,
    });
    return NextResponse.json({ error: "Cancellation reconciliation failed." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return reconcile(request);
}

export async function POST(request: Request) {
  return reconcile(request);
}
