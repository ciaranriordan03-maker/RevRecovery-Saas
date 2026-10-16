import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { sanitizeAppRedirect } from "../../lib/safe-redirect";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "../../lib/supabase/env";

function createAuthCallbackClient(request: NextRequest, response: NextResponse) {
  const url = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();

  if (!url || !publishableKey) {
    throw new Error("Supabase URL and publishable key are required.");
  }

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headersToSet) {
        cookiesToSet.forEach(({ name, options, value }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headersToSet).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      },
    },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = (searchParams.get("type") as EmailOtpType | null) ?? "email";
  const next = sanitizeAppRedirect(searchParams.get("next"), "/onboarding");
  const redirectTo = new URL(next, request.url);
  redirectTo.searchParams.delete("code");
  redirectTo.searchParams.delete("token_hash");
  redirectTo.searchParams.delete("type");

  const successResponse = NextResponse.redirect(redirectTo);
  const supabase = createAuthCallbackClient(request, successResponse);

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return successResponse;
    }
  }

  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error) {
      return successResponse;
    }
  }

  redirectTo.pathname = "/login";
  redirectTo.searchParams.delete("email");
  redirectTo.searchParams.delete("next");
  redirectTo.searchParams.set("status", "error");
  redirectTo.searchParams.set(
    "message",
    "That sign-in link is no longer valid. Please sign in with your email and password.",
  );
  return NextResponse.redirect(redirectTo);
}
