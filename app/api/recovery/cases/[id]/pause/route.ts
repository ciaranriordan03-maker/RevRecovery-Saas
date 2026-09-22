import { NextResponse } from "next/server";
import { setRecoveryCaseManualPause } from "../../../../../lib/server/recovery-case-actions";
import { createClient } from "../../../../../lib/supabase/server";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!UUID_PATTERN.test(id)) {
      return NextResponse.json({ error: "Recovery case not found." }, { status: 404 });
    }

    const body = (await request.json()) as { paused?: unknown };
    if (typeof body.paused !== "boolean") {
      return NextResponse.json(
        { error: "A pause or resume action is required." },
        { status: 400 },
      );
    }

    const result = await setRecoveryCaseManualPause({
      failedPaymentId: id,
      paused: body.paused,
      userId,
    });
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Unable to update recovery case.";
    const status = message.includes("not found")
      ? 404
      : message.includes("Resolved recovery cases")
        ? 409
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
