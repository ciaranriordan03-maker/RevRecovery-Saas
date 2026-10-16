import { NextResponse } from "next/server";
import {
  getNotificationTestRecipientSettingsForUser,
  NotificationTestRecipientSettingsError,
  updateNotificationTestRecipientSettingsForUser,
} from "../../../../lib/server/notification-test-recipient-settings";
import { createClient } from "../../../../lib/supabase/server";

async function getAuthenticatedUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return typeof data?.claims?.sub === "string" ? data.claims.sub : null;
}

function errorResponse(error: unknown, fallback: string) {
  const status = error instanceof NotificationTestRecipientSettingsError
    ? error.status
    : 500;
  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallback },
    { status },
  );
}

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({
      settings: await getNotificationTestRecipientSettingsForUser(userId),
    });
  } catch (error) {
    return errorResponse(error, "Unable to load notification recipient settings.");
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = (await request.json()) as { action?: unknown; recipient?: unknown };
    return NextResponse.json({
      settings: await updateNotificationTestRecipientSettingsForUser(userId, body),
    });
  } catch (error) {
    return errorResponse(error, "Unable to update notification recipient settings.");
  }
}
