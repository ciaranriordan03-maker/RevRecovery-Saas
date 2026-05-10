"use client";

import { createBrowserClient } from "@supabase/ssr";

function extractSingleEnvValue(value: string) {
  return value
    .split(/\s+[A-Z0-9_]+=/)[0]
    .trim()
    .split(/\s+/)[0]
    ?.trim() ?? "";
}

function getBrowserEnvValue(key: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" | "NEXT_PUBLIC_SUPABASE_URL") {
  const rawValue = process.env[key];
  const value = rawValue ? extractSingleEnvValue(rawValue) : "";

  if (!value) {
    throw new Error(`${key} is required.`);
  }

  if (/\s/.test(value) || /\b[A-Z0-9_]+=/.test(value)) {
    throw new Error(
      `${key} is malformed. Check the environment variable value for extra lines, spaces, or pasted KEY=value pairs.`,
    );
  }

  return value;
}

export function createClient() {
  return createBrowserClient(
    getBrowserEnvValue("NEXT_PUBLIC_SUPABASE_URL"),
    getBrowserEnvValue("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  );
}
