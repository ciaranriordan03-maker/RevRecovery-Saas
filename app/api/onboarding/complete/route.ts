import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";
import { markUserOnboardingCompleted } from "../../../lib/server/onboarding-store";

export async function POST() {
  const claims = await requireUser();
  const profile = await markUserOnboardingCompleted(claims.sub);

  return NextResponse.json({ profile });
}
