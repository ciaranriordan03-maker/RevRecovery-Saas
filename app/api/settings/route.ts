import { NextResponse } from "next/server";
import { mergeUserSettings } from "../../lib/settings";
import { getUserSettings, saveUserSettings } from "../../lib/server/settings-store";
import { createClient } from "../../lib/supabase/server";

async function getAuthenticatedUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims || typeof claims.sub !== "string") {
    return null;
  }

  return claims.sub;
}

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const record = await getUserSettings(userId);

    return NextResponse.json(record);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load settings.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { settings?: unknown };
    const settings = mergeUserSettings(body.settings as never);
    const record = await saveUserSettings(userId, settings);

    return NextResponse.json(record);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save settings.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
