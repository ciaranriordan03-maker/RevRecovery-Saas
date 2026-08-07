import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAppUrl,
  getStripeConnectRedirectUri,
  hasStripeConnectEnv,
} from "../app/lib/stripe/env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Stripe environment configuration", () => {
  it("builds the canonical callback URI without duplicate slashes", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://rev-recovery-saas.vercel.app///");

    expect(getAppUrl()).toBe("https://rev-recovery-saas.vercel.app");
    expect(getStripeConnectRedirectUri()).toBe(
      "https://rev-recovery-saas.vercel.app/api/stripe/connect/callback",
    );
  });

  it("falls back to localhost for malformed application URLs", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "rev-recovery-saas.vercel.app");

    expect(getAppUrl()).toBe("http://localhost:3000");
  });

  it("requires an explicit application URL in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STRIPE_SECRET_KEY", "stripe-secret");
    vi.stubEnv("STRIPE_CONNECT_CLIENT_ID", "connect-client");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    expect(hasStripeConnectEnv()).toBe(false);

    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://rev-recovery-saas.vercel.app");
    expect(hasStripeConnectEnv()).toBe(true);
  });
});
