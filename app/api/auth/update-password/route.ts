import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "../../../lib/supabase/env";

function loginRedirect(request: NextRequest, message: string, status: "error" | "info") {
  const url = new URL("/login", request.url);
  url.searchParams.set("message", message);
  url.searchParams.set("status", status);
  return NextResponse.redirect(url, 303);
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return true;
  }

  return origin === new URL(request.url).origin;
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return loginRedirect(request, "That password reset request was rejected.", "error");
  }

  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (password.length < 8) {
    return loginRedirect(request, "Your password must be at least 8 characters.", "error");
  }

  if (password !== confirmPassword) {
    return loginRedirect(request, "Passwords do not match.", "error");
  }

  const url = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();

  if (!url || !publishableKey) {
    return loginRedirect(request, "Password reset is temporarily unavailable.", "error");
  }

  const successResponse = loginRedirect(
    request,
    "Password updated. You can now sign in with your new password.",
    "info",
  );
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headersToSet) {
        cookiesToSet.forEach(({ name, options, value }) => {
          successResponse.cookies.set(name, value, options);
        });
        Object.entries(headersToSet).forEach(([name, value]) => {
          successResponse.headers.set(name, value);
        });
      },
    },
  });

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    const message =
      error.message === "Auth session missing!"
        ? "That reset session is missing or expired. Please request a new password reset link."
        : error.message;
    return loginRedirect(request, message, "error");
  }

  const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });

  if (signOutError) {
    return loginRedirect(
      request,
      "Your password was updated, but the reset session could not be closed. Please close this browser tab before signing in again.",
      "error",
    );
  }

  return successResponse;
}
