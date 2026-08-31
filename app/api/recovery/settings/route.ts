import { NextResponse } from "next/server";
import {
  getRecoveryModeSettingsForUser,
  RecoveryModeSettingsError,
  updateRecoveryModeSettingsForUser,
} from "../../../lib/server/recovery-account-settings";
import { createClient } from "../../../lib/supabase/server";

async function getAuthenticatedUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  return claims && typeof claims.sub === "string" ? claims.sub : null;
}

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof RecoveryModeSettingsError) {
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

    const recovery = await getRecoveryModeSettingsForUser(userId);
    return NextResponse.json({ recovery });
  } catch (error) {
    return errorResponse(error, "Unable to load recovery mode.");
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      approvedTestRecipient?: unknown;
      mode?: unknown;
      scheduleId?: unknown;
      timezone?: unknown;
    };
    const recovery = await updateRecoveryModeSettingsForUser(userId, body);
    return NextResponse.json({ recovery });
  } catch (error) {
    return errorResponse(error, "Unable to save recovery mode.");
  }
}
