import { NextResponse } from "next/server";
import {
  getNotificationTestAuthorizationForUser,
  NotificationTestAuthorizationError,
  updateNotificationTestAuthorizationForUser,
} from "../../../../lib/server/notification-test-authorization";
import { createClient } from "../../../../lib/supabase/server";

async function getAuthenticatedUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return typeof data?.claims?.sub === "string" ? data.claims.sub : null;
}

function errorResponse(error: unknown, fallback: string) {
  const status = error instanceof NotificationTestAuthorizationError ? error.status : 500;
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
      settings: await getNotificationTestAuthorizationForUser(userId),
    });
  } catch (error) {
    return errorResponse(error, "Unable to load notification authorization.");
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = (await request.json()) as { action?: unknown; authorizationId?: unknown };
    return NextResponse.json({
      settings: await updateNotificationTestAuthorizationForUser(userId, body),
    });
  } catch (error) {
    return errorResponse(error, "Unable to update notification authorization.");
  }
}
