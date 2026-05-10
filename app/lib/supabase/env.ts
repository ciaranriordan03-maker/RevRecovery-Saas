type SupabaseEnvKey =
  | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "SUPABASE_SECRET_KEY";

function extractSingleEnvValue(value: string) {
  const trimmedValue = value.trim();
  const withoutKeyName = trimmedValue.replace(/^[A-Z0-9_]+\s*=\s*/, "");
  const singleValue = withoutKeyName
    .split(/\s+[A-Z0-9_]+=/)[0]
    .trim()
    .split(/\s+/)[0]
    ?.trim() ?? "";

  if (
    (singleValue.startsWith('"') && singleValue.endsWith('"')) ||
    (singleValue.startsWith("'") && singleValue.endsWith("'"))
  ) {
    return singleValue.slice(1, -1).trim();
  }

  return singleValue;
}

function normalizeEnvValue(key: SupabaseEnvKey, value: string | undefined) {
  const normalized = value ? extractSingleEnvValue(value) : null;

  if (!normalized) {
    return null;
  }

  if (/\s/.test(normalized) || /\b[A-Z0-9_]+=/.test(normalized)) {
    throw new Error(
      `${key} is malformed. Check the environment variable value for extra lines, spaces, or pasted KEY=value pairs.`,
    );
  }

  return normalized;
}

export function getSupabaseUrl() {
  return normalizeEnvValue("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function getSupabasePublishableKey() {
  return normalizeEnvValue(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function getSupabaseSecretKey() {
  return normalizeEnvValue("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY);
}

export function hasSupabaseServerEnv() {
  return Boolean(getSupabaseUrl() && getSupabaseSecretKey());
}

export function hasSupabaseBrowserEnv() {
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey());
}
