import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getCurrentUserClaims } = vi.hoisted(() => ({
  getCurrentUserClaims: vi.fn(),
}));

vi.mock("../app/lib/auth", () => ({
  getCurrentUserClaims,
}));

vi.mock("../app/lib/stripe/env", () => ({
  getStripeConnectClientId: () => "ca_test_client",
  getStripeConnectRedirectUri: () =>
    "https://preview.example/api/stripe/connect/callback",
  hasStripeConnectEnv: () => true,
}));

vi.mock("../app/lib/server/stripe-connections", () => ({
  upsertStripeConnection: vi.fn(),
}));

vi.mock("../app/lib/server/stripe-sync", () => ({
  performInitialStripeSync: vi.fn(),
}));

vi.mock("../app/lib/stripe/server", () => ({
  createStripePlatformClient: vi.fn(),
}));

import { GET as beginStripeConnect } from "../app/api/stripe/connect/route";
import { GET as finishStripeConnect } from "../app/api/stripe/connect/callback/route";
import { sanitizeAppRedirect } from "../app/lib/safe-redirect";

const fallback = "/dashboard/settings";

function encodeState(next: string) {
  return Buffer.from(
    JSON.stringify({
      next,
      nonce: "nonce",
      userId: "user-id",
    }),
    "utf8",
  ).toString("base64url");
}

function decodeState(state: string) {
  return JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as {
    next: string;
    nonce: string;
    userId: string;
  };
}

describe("Stripe Connect redirect safety", () => {
  beforeEach(() => {
    getCurrentUserClaims.mockReset();
  });

  it.each([
    "https://attacker.example/phish",
    "//attacker.example/phish",
    "/\\attacker.example/phish",
    "\\attacker.example/phish",
  ])("rejects hostile redirect value %s", (value) => {
    expect(sanitizeAppRedirect(value, fallback)).toBe(fallback);
  });

  it("preserves an allowed internal dashboard path and query", () => {
    expect(
      sanitizeAppRedirect("/dashboard/settings?section=stripe", fallback),
    ).toBe("/dashboard/settings?section=stripe");
  });

  it("sanitizes the return path before redirecting an unauthenticated user", async () => {
    getCurrentUserClaims.mockResolvedValue(null);

    const response = await beginStripeConnect(
      new NextRequest(
        "https://preview.example/api/stripe/connect?next=%2F%2Fattacker.example%2Fphish",
      ),
    );
    const location = new URL(response.headers.get("location")!);

    expect(location.origin).toBe("https://preview.example");
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe(fallback);
  });

  it("stores only a sanitized return path in authenticated OAuth state", async () => {
    getCurrentUserClaims.mockResolvedValue({ sub: "user-id" });

    const response = await beginStripeConnect(
      new NextRequest(
        "https://preview.example/api/stripe/connect?next=%2F%5Cattacker.example%2Fphish",
      ),
    );
    const location = new URL(response.headers.get("location")!);
    const state = location.searchParams.get("state")!;

    expect(location.origin).toBe("https://connect.stripe.com");
    expect(decodeState(state).next).toBe(fallback);
    expect(response.cookies.get("stripe_connect_state")?.value).toBe(state);
  });

  it("does not trust a state return path unless the HttpOnly state cookie matches", async () => {
    const state = encodeState("/dashboard/recovery");
    const response = await finishStripeConnect(
      new NextRequest(
        `https://preview.example/api/stripe/connect/callback?error=access_denied&state=${state}`,
      ),
    );
    const location = new URL(response.headers.get("location")!);

    expect(location.origin).toBe("https://preview.example");
    expect(location.pathname).toBe(fallback);
    expect(response.cookies.get("stripe_connect_state")?.value).toBe("");
  });

  it("re-sanitizes a hostile return path even when the state cookie matches", async () => {
    const state = encodeState("//attacker.example/phish");
    const response = await finishStripeConnect(
      new NextRequest(
        `https://preview.example/api/stripe/connect/callback?error=access_denied&state=${state}`,
        {
          headers: {
            cookie: `stripe_connect_state=${state}`,
          },
        },
      ),
    );
    const location = new URL(response.headers.get("location")!);

    expect(location.origin).toBe("https://preview.example");
    expect(location.pathname).toBe(fallback);
  });

  it("honors a safe return path only when the state cookie matches", async () => {
    const state = encodeState("/dashboard/settings?section=stripe");
    const response = await finishStripeConnect(
      new NextRequest(
        `https://preview.example/api/stripe/connect/callback?error=access_denied&state=${state}`,
        {
          headers: {
            cookie: `stripe_connect_state=${state}`,
          },
        },
      ),
    );
    const location = new URL(response.headers.get("location")!);

    expect(location.origin).toBe("https://preview.example");
    expect(location.pathname).toBe("/dashboard/settings");
    expect(location.searchParams.get("section")).toBe("stripe");
  });
});
