import "server-only";

export function getStripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY ?? null;
}

export function getStripeConnectClientId() {
  return process.env.STRIPE_CONNECT_CLIENT_ID ?? null;
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function getStripeConnectRedirectUri() {
  return `${getAppUrl()}/api/stripe/connect/callback`;
}

export function hasStripeConnectEnv() {
  return Boolean(
    getStripeSecretKey() &&
      getStripeConnectClientId() &&
      getAppUrl(),
  );
}
