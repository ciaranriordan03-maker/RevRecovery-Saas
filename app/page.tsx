import { redirect } from "next/navigation";
import { getCurrentUserClaims } from "./lib/auth";
import { buildPasswordRecoveryCallbackPath } from "./lib/auth-callback";
import { getOrCreateUserOnboardingProfile } from "./lib/server/onboarding-store";

type HomeProps = {
  searchParams?: Promise<{
    code?: string;
    token_hash?: string;
    type?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const callbackPath = buildPasswordRecoveryCallbackPath(params ?? {});

  if (callbackPath) {
    redirect(callbackPath);
  }

  const claims = await getCurrentUserClaims();

  if (!claims || typeof claims.sub !== "string") {
    redirect("/login");
  }

  const profile = await getOrCreateUserOnboardingProfile(claims.sub);
  redirect(profile.onboardingCompleted ? "/dashboard" : "/onboarding");
}
