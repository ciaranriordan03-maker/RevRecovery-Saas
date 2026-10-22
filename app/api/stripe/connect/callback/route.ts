import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUserClaims } from "../../../../lib/auth";
import { sanitizeAppRedirect } from "../../../../lib/safe-redirect";
import { upsertStripeConnection } from "../../../../lib/server/stripe-connections";
import { performInitialStripeSync } from "../../../../lib/server/stripe-sync";
import { createStripePlatformClient } from "../../../../lib/stripe/server";

const STRIPE_CONNECT_STATE_COOKIE = "stripe_connect_state";
const STRIPE_CONNECT_FALLBACK = "/dashboard/settings";

function buildRedirect(request: NextRequest, path: string, message?: string) {
  const safePath = sanitizeAppRedirect(path, STRIPE_CONNECT_FALLBACK);
  const url = new URL(safePath, request.nextUrl.origin);
  if (message) {
    url.searchParams.set("message", message);
  }
  return url;
}

function buildRedirectResponse(
  request: NextRequest,
  path: string,
  message?: string,
) {
  const response = NextResponse.redirect(buildRedirect(request, path, message));
  response.cookies.set(STRIPE_CONNECT_STATE_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
  });
  return response;
}

function getFailureRedirectPath(
  parsedState: StripeConnectState | null,
  stateIsValid: boolean,
) {
  return stateIsValid
    ? parsedState?.next ?? STRIPE_CONNECT_FALLBACK
    : STRIPE_CONNECT_FALLBACK;
}

type StripeConnectState = {
  next: string;
  nonce: string;
  userId: string;
};

function parseState(state: string | null): StripeConnectState | null {
  if (!state) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(state, "base64url").toString("utf8"),
    ) as unknown;

    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof (parsed as StripeConnectState).next !== "string" ||
      typeof (parsed as StripeConnectState).nonce !== "string" ||
      typeof (parsed as StripeConnectState).userId !== "string"
    ) {
      return null;
    }

    return parsed as StripeConnectState;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");
  const errorDescription = request.nextUrl.searchParams.get("error_description");
  const cookieState = request.cookies.get(STRIPE_CONNECT_STATE_COOKIE)?.value ?? null;
  const stateMatchesCookie = Boolean(state && cookieState && cookieState === state);
  const parsedState = stateMatchesCookie ? parseState(state) : null;
  const stateIsValid = Boolean(stateMatchesCookie && parsedState);

  if (error) {
    console.warn("Stripe Connect OAuth returned an error", {
      error,
      hasState: Boolean(state),
      stateIsValid,
    });

    return buildRedirectResponse(
      request,
      getFailureRedirectPath(parsedState, stateIsValid),
      stateIsValid
        ? errorDescription ?? "Stripe connection was cancelled."
        : "Stripe Connect session expired or returned to a different app domain. Please try connecting Stripe again from this same browser window.",
    );
  }

  if (!code || !stateIsValid || !parsedState) {
    console.warn("Stripe Connect state validation failed", {
      hasCode: Boolean(code),
      hasCookieState: Boolean(cookieState),
      hasParsedState: Boolean(parsedState),
      hasState: Boolean(state),
      stateMatchesCookie,
    });

    return buildRedirectResponse(
      request,
      getFailureRedirectPath(parsedState, stateIsValid),
      "Stripe Connect session expired or returned to a different app domain. Please try connecting Stripe again from this same browser window.",
    );
  }

  const claims = await getCurrentUserClaims();

  if (!claims || typeof claims.sub !== "string" || claims.sub !== parsedState.userId) {
    return buildRedirectResponse(
      request,
      "/login",
      "Please log in again before connecting Stripe.",
    );
  }

  const stripe = createStripePlatformClient();

  if (!stripe) {
    return buildRedirectResponse(
      request,
      parsedState.next,
      "Stripe Connect is not configured.",
    );
  }

  try {
    const tokenResponse = await stripe.oauth.token({
      code,
      grant_type: "authorization_code",
    });

    if (!tokenResponse.access_token || !tokenResponse.stripe_user_id) {
      return buildRedirectResponse(
        request,
        parsedState.next,
        "Stripe did not return a valid access token.",
      );
    }

    const account = await stripe.accounts.retrieve(tokenResponse.stripe_user_id);
    const syncSummary = await performInitialStripeSync(tokenResponse.stripe_user_id);
    const now = new Date().toISOString();

    await upsertStripeConnection({
      access_token: tokenResponse.access_token,
      account_display_name:
        account.business_profile?.name ??
        account.settings?.dashboard?.display_name ??
        account.email ??
        tokenResponse.stripe_user_id,
      account_email: account.email ?? null,
      connected_at: now,
      last_synced_at: now,
      livemode: tokenResponse.livemode ?? null,
      refresh_token: tokenResponse.refresh_token ?? null,
      scope: tokenResponse.scope ?? null,
      status: "connected",
      stripe_account_id: tokenResponse.stripe_user_id,
      sync_summary: syncSummary,
      user_id: parsedState.userId,
    });
  } catch (stripeError) {
    const message =
      stripeError instanceof Error
        ? stripeError.message
        : "Unable to finish the Stripe connection.";

    console.error("Stripe Connect callback failed", {
      message,
      next: parsedState.next,
      userId: parsedState.userId,
    });

    return buildRedirectResponse(request, parsedState.next, message);
  }

  return buildRedirectResponse(
    request,
    parsedState.next,
    "Stripe connected successfully.",
  );
}
