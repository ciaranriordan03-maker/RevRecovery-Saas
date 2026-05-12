import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "../../lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = (searchParams.get("type") as EmailOtpType | null) ?? "email";
  const next = searchParams.get("next") ?? "/onboarding";
  const redirectTo = request.nextUrl.clone();

  redirectTo.pathname = "/login";
  redirectTo.searchParams.delete("code");
  redirectTo.searchParams.delete("token_hash");
  redirectTo.searchParams.delete("type");
  redirectTo.searchParams.set("next", next);
  redirectTo.searchParams.set("status", "verified");
  redirectTo.searchParams.set("message", "Your email has been successfully confirmed.");

  const supabase = await createClient();

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (data.user?.email) {
        redirectTo.searchParams.set("email", data.user.email);
      }

      return NextResponse.redirect(redirectTo);
    }
  }

  if (tokenHash) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error) {
      if (data.user?.email) {
        redirectTo.searchParams.set("email", data.user.email);
      }

      return NextResponse.redirect(redirectTo);
    }
  }

  redirectTo.pathname = "/login";
  redirectTo.searchParams.delete("email");
  redirectTo.searchParams.delete("next");
  redirectTo.searchParams.set("status", "error");
  redirectTo.searchParams.set(
    "message",
    "We could not verify that email link. Request a new confirmation email or sign in if your account is already verified.",
  );
  return NextResponse.redirect(redirectTo);
}
