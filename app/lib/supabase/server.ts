import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublishableKey, getSupabaseUrl } from "./env";

function requireSupabaseServerAuthEnv() {
  const url = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();

  if (!url || !publishableKey) {
    throw new Error("Supabase URL and publishable key are required.");
  }

  return {
    publishableKey,
    url,
  };
}

export async function createClient() {
  const cookieStore = await cookies();
  const { publishableKey, url } = requireSupabaseServerAuthEnv();

  return createServerClient(
    url,
    publishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, options, value }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot always set cookies directly.
          }
        },
      },
    },
  );
}
