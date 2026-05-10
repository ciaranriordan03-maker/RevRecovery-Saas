import { NextResponse } from "next/server";
import { getOrCreateUserOnboardingProfile, updateUserProfile } from "../../lib/server/onboarding-store";
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

    const profile = await getOrCreateUserOnboardingProfile(userId);
    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load profile.",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      avatarSeed?: unknown;
      fullName?: unknown;
    };
    const avatarSeed =
      typeof body.avatarSeed === "string" && body.avatarSeed.trim().length > 0
        ? body.avatarSeed.trim()
        : null;
    const fullName =
      typeof body.fullName === "string" && body.fullName.trim().length > 0
        ? body.fullName.trim()
        : null;
    const profile = await updateUserProfile(userId, {
      avatarSeed,
      fullName,
    });

    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to save profile.",
      },
      { status: 500 },
    );
  }
}
