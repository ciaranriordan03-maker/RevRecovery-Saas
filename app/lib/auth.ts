import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { getOrCreateUserOnboardingProfile } from "./server/onboarding-store";

export async function getCurrentUserClaims() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  return claims ?? null;
}

export async function requireUser() {
  const claims = await getCurrentUserClaims();

  if (!claims || typeof claims.sub !== "string") {
    redirect("/login");
  }

  return claims;
}

export async function requireCompletedOnboarding() {
  const claims = await requireUser();
  const profile = await getOrCreateUserOnboardingProfile(claims.sub);

  if (!profile.onboardingCompleted) {
    redirect("/onboarding");
  }

  return {
    claims,
    profile,
  };
}

export async function requireIncompleteOnboarding() {
  const claims = await requireUser();
  const profile = await getOrCreateUserOnboardingProfile(claims.sub);

  if (profile.onboardingCompleted) {
    redirect("/dashboard");
  }

  return {
    claims,
    profile,
  };
}
