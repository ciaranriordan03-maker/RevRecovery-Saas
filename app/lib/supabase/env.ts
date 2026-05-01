import "server-only";

export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
}

export function getSupabasePublishableKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? null;
}

export function getSupabaseSecretKey() {
  return process.env.SUPABASE_SECRET_KEY ?? null;
}

export function hasSupabaseServerEnv() {
  return Boolean(getSupabaseUrl() && getSupabaseSecretKey());
}

export function hasSupabaseBrowserEnv() {
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey());
}
