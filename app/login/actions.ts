"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "../lib/supabase/server";

type AuthRedirectState = "check-email" | "error" | "info" | "verified";

function redirectWithMessage({
  email,
  message,
  next,
  status = "info",
}: {
  email?: string | null;
  message: string;
  next?: string | null;
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
    redirectWithMessage({
      email,
      message: error.message,
      next,
      status: "error",
    });
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
    redirectWithMessage({
      email,
      message: error.message,
      next,
      status: "error",
    });
  }

  redirectWithMessage({
    email,
    message: "We sent a confirmation link to your inbox.",
    next,
    status: "check-email",
  });
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
