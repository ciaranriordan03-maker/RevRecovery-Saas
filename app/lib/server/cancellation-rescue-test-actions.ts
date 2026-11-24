import "server-only";

import type Stripe from "stripe";
import {
  evaluateCancellationTestRescueSubscription,
  type CancellationTestRescueSubscription,
} from "../cancellation-rescue/test-rescue-policy";
import { getCancellationTestRescueRateLimitKey } from "../cancellation-rescue/test-rescue-request";
import {
  createCancellationTestRescueToken,
  hashCancellationTestRescueToken,
  isCancellationTestRescueTokenCandidate,
} from "../cancellation-rescue/test-rescue-token";
import { getStripeSecretKey } from "../stripe/env";
import { createStripePlatformClient } from "../stripe/server";
import { createSupabaseAdminClient } from "../supabase/admin";
import { getStripeConnectionWebhookMetadata } from "./stripe-connections";

export type CancellationTestRescueErrorCode =
  | "configuration_unavailable"
  | "state_changed"
  | "storage_unavailable"
  | "stripe_outcome_unknown"
  | "stripe_request_failed"
  | "token_unavailable";

export class CancellationTestRescueUnavailableError extends Error {
  readonly code: CancellationTestRescueErrorCode;

  constructor(code: CancellationTestRescueErrorCode) {
    super("Cancellation test rescue is unavailable.");
    this.name = "CancellationTestRescueUnavailableError";
    this.code = code;
  }
}

type TestRescuePreviewRow = {
  cancellation_case_id: string;
  expires_at: string;
  scheduled_end_at: string;
  token_id: string;
};

type TestRescueReservationRow = {
  cancellation_case_id: string;
  idempotency_key: string;
  stripe_account_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  token_id: string;
  user_id: string;
};

type TestRescueReservation = TestRescueReservationRow & {
  reservationToken: string;
};

type StripeSubscriptionWithLegacyPeriodEnd = Stripe.Subscription & {
  current_period_end?: number | null;
  lastResponse?: { requestId?: string };
};

const RATE_LIMITS = {
  confirm: { limit: 10, windowSeconds: 60 * 60 },
  preview: { limit: 30, windowSeconds: 15 * 60 },
} as const;

function getRateLimitSecret() {
  const secret = process.env.CANCELLATION_RESCUE_RATE_LIMIT_SECRET?.trim();
  return secret && secret.length >= 32 ? secret : null;
}

function getStripeRequestId(value: unknown) {
  if (!value || typeof value !== "object") return null;

  const requestId = (value as { requestId?: unknown }).requestId;
  if (typeof requestId === "string" && requestId.length <= 255) return requestId;

  const lastResponse = (value as { lastResponse?: unknown }).lastResponse;
  if (!lastResponse || typeof lastResponse !== "object") return null;

  const responseRequestId = (lastResponse as { requestId?: unknown }).requestId;
  return typeof responseRequestId === "string" && responseRequestId.length <= 255
    ? responseRequestId
    : null;
}

function getStripeCustomerId(customer: Stripe.Subscription["customer"]) {
  return typeof customer === "string" ? customer : customer?.id ?? null;
}

function toPolicySubscription(
  subscription: Stripe.Subscription,
): CancellationTestRescueSubscription {
  const compatibleSubscription = subscription as StripeSubscriptionWithLegacyPeriodEnd;

  return {
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    livemode: subscription.livemode,
    scheduledEndEpochSeconds:
      subscription.cancel_at ?? compatibleSubscription.current_period_end ?? null,
    status: subscription.status,
    stripeCustomerId: getStripeCustomerId(subscription.customer),
    stripeSubscriptionId: subscription.id,
  };
}

function isReservationRow(value: unknown): value is TestRescueReservationRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<TestRescueReservationRow>;

  return [
    row.cancellation_case_id,
    row.idempotency_key,
    row.stripe_account_id,
    row.stripe_customer_id,
    row.stripe_subscription_id,
    row.token_id,
    row.user_id,
  ].every((field) => typeof field === "string" && field.length > 0);
}

async function reserveCancellationTestRescueToken(
  rawToken: string,
): Promise<TestRescueReservation> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new CancellationTestRescueUnavailableError("storage_unavailable");

  const reservationToken = crypto.randomUUID();
  const { data, error } = await supabase.rpc("reserve_cancellation_test_rescue_token", {
    requested_lease_seconds: 120,
    requested_reservation_token: reservationToken,
    requested_token_hash: hashCancellationTestRescueToken(rawToken),
  });
  const row = data?.[0] as unknown;

  if (error) throw new CancellationTestRescueUnavailableError("storage_unavailable");
  if (!isReservationRow(row)) {
    throw new CancellationTestRescueUnavailableError("token_unavailable");
  }

  return { ...row, reservationToken };
}

async function completeCancellationTestRescueAttempt({
  errorCode,
  outcome,
  postCancelAtPeriodEnd,
  preCancelAtPeriodEnd,
  reservation,
  stripeRequestId,
}: {
  errorCode: string | null;
  outcome: "reconciliation_required" | "rejected" | "stripe_accepted";
  postCancelAtPeriodEnd: boolean | null;
  preCancelAtPeriodEnd: boolean | null;
  reservation: TestRescueReservation;
  stripeRequestId: string | null;
}) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new CancellationTestRescueUnavailableError("storage_unavailable");

  const { data, error } = await supabase.rpc("complete_cancellation_test_rescue_attempt", {
    requested_error_code: errorCode,
    requested_outcome: outcome,
    requested_post_cancel_at_period_end: postCancelAtPeriodEnd,
    requested_pre_cancel_at_period_end: preCancelAtPeriodEnd,
    requested_reservation_token: reservation.reservationToken,
    requested_stripe_request_id: stripeRequestId,
    requested_token_id: reservation.token_id,
  });

  if (error || data !== true) {
    throw new CancellationTestRescueUnavailableError("storage_unavailable");
  }
}

async function rejectReservedAttempt({
  code,
  reservation,
  stripeRequestId = null,
}: {
  code: string;
  reservation: TestRescueReservation;
  stripeRequestId?: string | null;
}) {
  await completeCancellationTestRescueAttempt({
    errorCode: code,
    outcome: "rejected",
    postCancelAtPeriodEnd: null,
    preCancelAtPeriodEnd: null,
    reservation,
    stripeRequestId,
  });
}

export async function issueCancellationTestRescueToken({
  cancellationCaseId,
  expiresInSeconds = 15 * 60,
}: {
  cancellationCaseId: string;
  expiresInSeconds?: number;
}) {
  if (!Number.isInteger(expiresInSeconds) || expiresInSeconds < 60 || expiresInSeconds > 3600) {
    throw new CancellationTestRescueUnavailableError("configuration_unavailable");
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new CancellationTestRescueUnavailableError("storage_unavailable");

  const token = createCancellationTestRescueToken();
  const tokenId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
  const { data, error } = await supabase.rpc("issue_cancellation_test_rescue_token", {
    requested_case_id: cancellationCaseId,
    requested_expires_at: expiresAt,
    requested_idempotency_key: `cancellation-test-rescue-${tokenId}`,
    requested_token_hash: token.tokenHash,
    requested_token_id: tokenId,
  });

  if (error || data !== tokenId) {
    throw new CancellationTestRescueUnavailableError("storage_unavailable");
  }

  return { expiresAt, rawToken: token.rawToken };
}

export async function consumeCancellationTestRescueRateLimit({
  endpoint,
  request,
}: {
  endpoint: "confirm" | "preview";
  request: Request;
}) {
  const secret = getRateLimitSecret();
  if (!secret) {
    throw new CancellationTestRescueUnavailableError("configuration_unavailable");
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new CancellationTestRescueUnavailableError("storage_unavailable");

  const policy = RATE_LIMITS[endpoint];
  const { data, error } = await supabase.rpc("consume_cancellation_test_rescue_rate_limit", {
    requested_endpoint: endpoint,
    requested_limit: policy.limit,
    requested_rate_limit_key: getCancellationTestRescueRateLimitKey({
      endpoint,
      request,
      secret,
    }),
    requested_window_seconds: policy.windowSeconds,
  });

  if (error) throw new CancellationTestRescueUnavailableError("storage_unavailable");
  return data === true;
}

export async function previewCancellationTestRescueToken(rawToken: unknown) {
  if (!isCancellationTestRescueTokenCandidate(rawToken)) return null;

  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new CancellationTestRescueUnavailableError("storage_unavailable");

  const { data, error } = await supabase.rpc("preview_cancellation_test_rescue_token", {
    requested_token_hash: hashCancellationTestRescueToken(rawToken),
  });

  if (error) throw new CancellationTestRescueUnavailableError("storage_unavailable");
  const row = data?.[0] as Partial<TestRescuePreviewRow> | undefined;
  if (
    !row ||
    typeof row.expires_at !== "string" ||
    typeof row.scheduled_end_at !== "string"
  ) {
    return null;
  }

  return {
    expiresAt: row.expires_at,
    scheduledEndAt: row.scheduled_end_at,
  };
}

export async function confirmCancellationTestRescueToken(rawToken: unknown) {
  if (!isCancellationTestRescueTokenCandidate(rawToken)) {
    throw new CancellationTestRescueUnavailableError("token_unavailable");
  }

  const secretKey = getStripeSecretKey();
  const stripe = createStripePlatformClient();
  if (!secretKey?.startsWith("sk_test_") || !stripe) {
    throw new CancellationTestRescueUnavailableError("configuration_unavailable");
  }

  const reservation = await reserveCancellationTestRescueToken(rawToken);
  const connection = await getStripeConnectionWebhookMetadata(reservation.stripe_account_id);
  if (
    !connection ||
    connection.user_id !== reservation.user_id ||
    connection.status !== "connected" ||
    connection.livemode !== false
  ) {
    await rejectReservedAttempt({ code: "stripe_connection_unavailable", reservation });
    throw new CancellationTestRescueUnavailableError("state_changed");
  }

  let subscription: Stripe.Subscription;
  try {
    subscription = await stripe.subscriptions.retrieve(
      reservation.stripe_subscription_id,
      {},
      { stripeAccount: reservation.stripe_account_id },
    );
  } catch (error) {
    await rejectReservedAttempt({
      code: "stripe_retrieve_failed",
      reservation,
      stripeRequestId: getStripeRequestId(error),
    });
    throw new CancellationTestRescueUnavailableError("stripe_request_failed");
  }

  const policy = evaluateCancellationTestRescueSubscription({
    expectedCustomerId: reservation.stripe_customer_id,
    expectedSubscriptionId: reservation.stripe_subscription_id,
    nowEpochSeconds: Math.floor(Date.now() / 1000),
    subscription: toPolicySubscription(subscription),
  });
  if (!policy.eligible) {
    await rejectReservedAttempt({ code: policy.reason, reservation });
    throw new CancellationTestRescueUnavailableError("state_changed");
  }

  let updatedSubscription: Stripe.Subscription;
  try {
    updatedSubscription = await stripe.subscriptions.update(
      reservation.stripe_subscription_id,
      { cancel_at_period_end: false },
      {
        idempotencyKey: reservation.idempotency_key,
        stripeAccount: reservation.stripe_account_id,
      },
    );
  } catch (error) {
    try {
      await completeCancellationTestRescueAttempt({
        errorCode: "stripe_update_outcome_unknown",
        outcome: "reconciliation_required",
        postCancelAtPeriodEnd: null,
        preCancelAtPeriodEnd: subscription.cancel_at_period_end,
        reservation,
        stripeRequestId: getStripeRequestId(error),
      });
    } catch {
      // The expiring reservation is deliberately left for reconciliation.
    }
    throw new CancellationTestRescueUnavailableError("stripe_outcome_unknown");
  }

  const updateReflected = updatedSubscription.cancel_at_period_end === false;
  try {
    await completeCancellationTestRescueAttempt({
      errorCode: updateReflected ? null : "stripe_update_not_reflected",
      outcome: updateReflected ? "stripe_accepted" : "reconciliation_required",
      postCancelAtPeriodEnd: updatedSubscription.cancel_at_period_end,
      preCancelAtPeriodEnd: subscription.cancel_at_period_end,
      reservation,
      stripeRequestId: getStripeRequestId(updatedSubscription),
    });
  } catch {
    // A stale reservation is consumed by reconciliation, preventing replay.
    throw new CancellationTestRescueUnavailableError("stripe_outcome_unknown");
  }

  if (!updateReflected) {
    throw new CancellationTestRescueUnavailableError("stripe_outcome_unknown");
  }

  return { accepted: true as const, status: "processing" as const };
}

export async function maintainCancellationTestRescueActions(limit = 100) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new CancellationTestRescueUnavailableError("storage_unavailable");

  const boundedLimit = Math.min(Math.max(Math.floor(limit), 1), 500);
  const { data: stale, error: staleError } = await supabase.rpc(
    "reconcile_stale_cancellation_test_rescue_reservations",
    { requested_limit: boundedLimit },
  );
  if (staleError) throw new CancellationTestRescueUnavailableError("storage_unavailable");

  const { data: expired, error: expiredError } = await supabase.rpc(
    "expire_cancellation_test_rescue_tokens",
    { requested_limit: boundedLimit },
  );
  if (expiredError) throw new CancellationTestRescueUnavailableError("storage_unavailable");

  const { data: confirmed, error: confirmedError } = await supabase.rpc(
    "finalize_confirmed_cancellation_test_rescues",
    { requested_limit: boundedLimit },
  );
  if (confirmedError) throw new CancellationTestRescueUnavailableError("storage_unavailable");

  return {
    confirmed: Number(confirmed ?? 0),
    expired: Number(expired ?? 0),
    staleReservations: Number(stale ?? 0),
  };
}
