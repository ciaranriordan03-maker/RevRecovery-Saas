import { redirect } from "next/navigation";
import { getCurrentUserClaims } from "./lib/auth";
import { getOrCreateUserOnboardingProfile } from "./lib/server/onboarding-store";

export default async function Home() {
  const claims = await getCurrentUserClaims();

  if (!claims || typeof claims.sub !== "string") {
    redirect("/login");
  }

  const profile = await getOrCreateUserOnboardingProfile(claims.sub);
  redirect(profile.onboardingCompleted ? "/dashboard" : "/onboarding");
}
