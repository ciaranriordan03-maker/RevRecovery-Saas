"use server";

import { redirect } from "next/navigation";
import { sanitizeAppRedirect } from "../lib/safe-redirect";
import { createClient } from "../lib/supabase/server";
import {
  getOrCreateUserOnboardingProfile,
  updateUserProfile,
} from "../lib/server/onboarding-store";

type AuthRedirectState = "error" | "info";

function getAppUrl() {
  const rawValue = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  const normalized = rawValue.replace(/\s+/g, "").replace(/\/+$/, "");

  try {
    return new URL(normalized).toString().replace(/\/+$/, "");
  } catch {
    return "http://localhost:3000";
  }
}

function redirectWithMessage({
  email,
  message,
  next,
  path = "/login",
  status = "info",
}: {
  email?: string | null;
  message: string;
  next?: string | null;
  path?: "/login" | "/signup";
  status?: AuthRedirectState;
}) {
  const searchParams = new URLSearchParams();
  searchParams.set("message", message);
  searchParams.set("status", status);
  if (next) {
    searchParams.set("next", next);
  }
  if (email) {
    searchParams.set("email", email);
  }

  redirect(`${path}?${searchParams.toString()}`);
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = sanitizeAppRedirect(String(formData.get("next") ?? "/onboarding"));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirectWithMessage({
      email,
      message: error.message,
      next,
      status: "error",
    });
  }

  const userId = data.user?.id;

  if (userId && next === "/onboarding") {
    const profile = await getOrCreateUserOnboardingProfile(userId);
    redirect(profile.onboardingCompleted ? "/dashboard" : "/onboarding");
  }

  redirect(next || "/onboarding");
}

export async function signup(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const next = sanitizeAppRedirect(String(formData.get("next") ?? "/onboarding"));
  const source = String(formData.get("source") ?? "/login");
  const redirectPath = source === "/signup" ? "/signup" : "/login";
  if (confirmPassword && password !== confirmPassword) {
    redirectWithMessage({
      email,
      message: "Passwords do not match.",
      next,
      path: redirectPath,
      status: "error",
    });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    options: {
      data: fullName ? { full_name: fullName } : undefined,
    },
    password,
  });

  if (error) {
    redirectWithMessage({
      email,
      message: error.message,
      next,
      path: redirectPath,
      status: "error",
    });
  }

  if (data.user?.id && fullName) {
    await updateUserProfile(data.user.id, {
      avatarSeed: null,
      fullName,
    });
  }

  if (!data.session) {
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData.session) {
      redirectWithMessage({
        email,
        message:
          "Account created, but Supabase is still requiring email confirmation. Turn off email confirmations in Supabase Auth settings for the MVP no-confirmation flow.",
        next,
        path: redirectPath,
        status: "error",
      });
    }
  }

  redirect(next || "/onboarding");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getAppUrl()}/auth/confirm?next=/reset-password`,
  });

  if (error) {
    redirectWithMessage({
      email,
      message: error.message,
      path: "/login",
      status: "error",
    });
  }

  redirectWithMessage({
    email,
    message: "Password reset email sent. Check your inbox for the secure reset link.",
    path: "/login",
  });
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (password !== confirmPassword) {
    redirectWithMessage({
      message: "Passwords do not match.",
      path: "/login",
      status: "error",
    });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    redirectWithMessage({
      message: error.message,
      path: "/login",
      status: "error",
    });
  }

  redirectWithMessage({
    message: "Password updated. You can now sign in with your new password.",
    path: "/login",
  });
}
