import { redirect } from "next/navigation";
import { getCurrentUserClaims } from "./lib/auth";
import { getOrCreateUserOnboardingProfile } from "./lib/server/onboarding-store";
import { createClient } from "./lib/supabase/server";

type HomeProps = {
  searchParams?: Promise<{
    code?: string;
    token_hash?: string;
    type?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;

  if (params?.code || params?.token_hash) {
    const supabase = await createClient();

    if (params.code) {
      const { error } = await supabase.auth.exchangeCodeForSession(params.code);

      if (!error) {
        redirect("/reset-password");
      }
    }

    if (params.token_hash) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: params.token_hash,
        type: "recovery",
      });

      if (!error) {
        redirect("/reset-password");
      }
    }

    redirect("/login?status=error&message=That+reset+link+is+no+longer+valid.+Please+request+a+new+one.");
  }

  const claims = await getCurrentUserClaims();

  if (!claims || typeof claims.sub !== "string") {
    redirect("/login");
  }

  const profile = await getOrCreateUserOnboardingProfile(claims.sub);
  redirect(profile.onboardingCompleted ? "/dashboard" : "/onboarding");
}
