import { NextResponse } from "next/server";
import {
  getUserSettingsValidationError,
  mergeUserSettings,
} from "../../lib/settings";
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
    const validationError = getUserSettingsValidationError(settings);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const record = await saveUserSettings(userId, settings);

    return NextResponse.json(record);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save settings.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      email?: {
        replyToEmail?: unknown;
        senderName?: unknown;
        supportEmail?: unknown;
      };
    };

    if (
      !body.email ||
      typeof body.email.replyToEmail !== "string" ||
      typeof body.email.senderName !== "string" ||
      typeof body.email.supportEmail !== "string"
    ) {
      return NextResponse.json(
        { error: "Complete email settings are required." },
        { status: 400 },
      );
    }

    if (!body.email.senderName.trim()) {
      return NextResponse.json(
        { error: "Sender name is required." },
        { status: 400 },
      );
    }

    const currentRecord = await getUserSettings(userId);
    const settings = mergeUserSettings({
      ...currentRecord.settings,
      email: {
        ...currentRecord.settings.email,
        replyToEmail: body.email.replyToEmail,
        senderName: body.email.senderName,
        supportEmail: body.email.supportEmail,
      },
    });
    const validationError = getUserSettingsValidationError(settings);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const record = await saveUserSettings(userId, settings);

    return NextResponse.json(record);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save email settings.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
