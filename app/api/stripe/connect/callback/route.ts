import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUserClaims } from "../../../../lib/auth";
import { upsertStripeConnection } from "../../../../lib/server/stripe-connections";
import { performInitialStripeSync } from "../../../../lib/server/stripe-sync";
import { createStripePlatformClient } from "../../../../lib/stripe/server";

const STRIPE_CONNECT_STATE_COOKIE = "stripe_connect_state";

function buildRedirect(request: NextRequest, path: string, message?: string) {
  const url = new URL(path, request.url);
  if (message) {
    url.searchParams.set("message", message);
  }
  return url;
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
    return JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as StripeConnectState;
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
  const parsedState = parseState(state);

  if (error) {
    return NextResponse.redirect(
      buildRedirect(
        request,
        parsedState?.next ?? "/dashboard/settings",
        errorDescription ?? "Stripe connection was cancelled.",
      ),
    );
  }

  if (!code || !state || !cookieState || cookieState !== state || !parsedState) {
    return NextResponse.redirect(
      buildRedirect(request, "/dashboard/settings", "Invalid Stripe Connect state."),
    );
  }

  const claims = await getCurrentUserClaims();

  if (!claims || typeof claims.sub !== "string" || claims.sub !== parsedState.userId) {
    return NextResponse.redirect(
      buildRedirect(request, "/login", "Please log in again before connecting Stripe."),
    );
  }

  const stripe = createStripePlatformClient();

  if (!stripe) {
    return NextResponse.redirect(
      buildRedirect(request, parsedState.next, "Stripe Connect is not configured."),
    );
  }

  try {
    const tokenResponse = await stripe.oauth.token({
      code,
      grant_type: "authorization_code",
    });

    if (!tokenResponse.access_token || !tokenResponse.stripe_user_id) {
      return NextResponse.redirect(
        buildRedirect(request, parsedState.next, "Stripe did not return a valid access token."),
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

    return NextResponse.redirect(buildRedirect(request, parsedState.next, message));
  }

  const response = NextResponse.redirect(
    buildRedirect(request, parsedState.next, "Stripe connected successfully."),
  );
  response.cookies.set(STRIPE_CONNECT_STATE_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
  });

  return response;
}
