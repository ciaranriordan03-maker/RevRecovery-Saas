import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUserClaims } from "../../../lib/auth";
import { sanitizeAppRedirect } from "../../../lib/safe-redirect";
import {
  getStripeConnectClientId,
  getStripeConnectRedirectUri,
  hasStripeConnectEnv,
} from "../../../lib/stripe/env";

const STRIPE_CONNECT_STATE_COOKIE = "stripe_connect_state";
const STRIPE_CONNECT_FALLBACK = "/dashboard/settings";

function buildConnectRedirectUri(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return getStripeConnectRedirectUri();
  }

  return new URL("/api/stripe/connect/callback", request.nextUrl.origin)
    .toString()
    .trim();
}

export async function GET(request: NextRequest) {
  if (!hasStripeConnectEnv()) {
    return NextResponse.redirect(
      new URL(
        "/dashboard/settings?message=Stripe+Connect+is+not+configured",
        request.url,
      ),
    );
  }

  const next = sanitizeAppRedirect(
    request.nextUrl.searchParams.get("next"),
    STRIPE_CONNECT_FALLBACK,
  );
  const claims = await getCurrentUserClaims();

  if (!claims || typeof claims.sub !== "string") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", next);
    return NextResponse.redirect(loginUrl);
  }

  const state = Buffer.from(
    JSON.stringify({
      next,
      nonce: randomUUID(),
      userId: claims.sub,
    }),
    "utf8",
  ).toString("base64url");

  const authorizeUrl = new URL("https://connect.stripe.com/oauth/authorize");
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", getStripeConnectClientId()!);
  authorizeUrl.searchParams.set("scope", "read_write");
  authorizeUrl.searchParams.set("redirect_uri", buildConnectRedirectUri(request));
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(STRIPE_CONNECT_STATE_COOKIE, state, {
    httpOnly: true,
    maxAge: 60 * 10,
    path: "/",
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
  });

  return response;
}
