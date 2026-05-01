"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "../lib/supabase/server";

function redirectWithMessage(message: string, next?: string | null) {
  const searchParams = new URLSearchParams();
  searchParams.set("message", message);
  if (next) {
    searchParams.set("next", next);
  }

  redirect(`/login?${searchParams.toString()}`);
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/onboarding");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirectWithMessage(error.message, next);
  }

  redirect(next || "/onboarding");
}

export async function signup(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/onboarding");
  const headersList = await headers();
  const origin = headersList.get("origin") ?? "http://localhost:3000";

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
    password,
  });

  if (error) {
    redirectWithMessage(error.message, next);
  }

  redirectWithMessage(
    "Check your email to confirm your account, then log in.",
    next,
  );
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
