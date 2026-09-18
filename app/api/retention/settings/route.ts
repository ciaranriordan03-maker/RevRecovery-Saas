import { NextResponse } from "next/server";
import {
  getRetentionSettingsForUser,
  RetentionSettingsError,
  updateRetentionSettingsForUser,
} from "../../../lib/server/retention-settings";
import { createClient } from "../../../lib/supabase/server";

async function getAuthenticatedUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  return claims && typeof claims.sub === "string" ? claims.sub : null;
}

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof RetentionSettingsError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallback },
    { status: 500 },
  );
}

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const retention = await getRetentionSettingsForUser(userId);
    return NextResponse.json({ retention });
  } catch (error) {
    return errorResponse(error, "Unable to load retention settings.");
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      downgradeActionEnabled?: unknown;
      eligibleDowngradePriceIds?: unknown;
      pauseActionEnabled?: unknown;
      supportActionEnabled?: unknown;
      supportContactEmail?: unknown;
    };
    const retention = await updateRetentionSettingsForUser(userId, body);
    return NextResponse.json({ retention });
  } catch (error) {
    return errorResponse(error, "Unable to save retention settings.");
  }
}
