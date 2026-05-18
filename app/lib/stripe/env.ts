import "server-only";

function normalizeAppUrl(value: string | undefined) {
  const fallbackUrl = "http://localhost:3000";
  const rawValue = value ?? fallbackUrl;
  const withoutKeyName = rawValue.trim().replace(/^NEXT_PUBLIC_APP_URL\s*=\s*/, "");
  const normalized = withoutKeyName.replace(/\s+/g, "").replace(/\/+$/, "");

  if (!normalized) {
    return fallbackUrl;
  }

  try {
    const url = new URL(normalized);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return fallbackUrl;
    }

    return url.toString().replace(/\/+$/, "");
  } catch {
    return fallbackUrl;
  }
}

export function getStripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY?.trim() || null;
}

export function getStripeConnectClientId() {
  return process.env.STRIPE_CONNECT_CLIENT_ID?.trim() || null;
}

export function getAppUrl() {
  return normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL);
}

export function getStripeConnectRedirectUri() {
  return `${getAppUrl()}/api/stripe/connect/callback`;
}

function hasConfiguredAppUrl() {
  return Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim());
}

export function hasStripeConnectEnv() {
  return Boolean(
    getStripeSecretKey() &&
      getStripeConnectClientId() &&
      (process.env.NODE_ENV !== "production" || hasConfiguredAppUrl()) &&
      getAppUrl(),
  );
}
