import crypto from "node:crypto";
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { sendFoundingMemberWelcome } from "../../../../lib/server/founding-member-welcome";
import {
  claimWebhookEvent,
  completeWebhookEvent,
  getWebhookEventRecord,
  insertWebhookEventRecord,
} from "../../../../lib/server/stripe-webhooks";
import { getStripeSecretKey } from "../../../../lib/stripe/env";
import {
  getWebhookClaimDisposition,
  getWebhookRetryDelaySeconds,
  sanitizeWebhookError,
} from "../../../../lib/stripe/webhook-processing";

const RETRY_RESPONSE_STATUS = 503;
const PLATFORM_ACCOUNT_ID = "revrecovery_platform";

function getStripeClient() {
  const secretKey = getStripeSecretKey();
  return secretKey ? new Stripe(secretKey) : null;
}

function isPaidFoundingMemberSession(session: Stripe.Checkout.Session) {
  const expectedPaymentLinkId =
    process.env.STRIPE_FOUNDING_MEMBER_PAYMENT_LINK_ID?.trim();
  const paymentLinkId =
    typeof session.payment_link === "string"
      ? session.payment_link
      : session.payment_link?.id;

  return Boolean(
    expectedPaymentLinkId &&
      paymentLinkId === expectedPaymentLinkId &&
      session.payment_status === "paid",
  );
}

function getCustomerEmail(session: Stripe.Checkout.Session) {
  return session.customer_details?.email?.trim() || session.customer_email?.trim() || null;
}

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_BILLING_WEBHOOK_SECRET?.trim();
  const signature = request.headers.get("stripe-signature");

  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Billing webhook is not configured." }, { status: 500 });
  }

  if (!signature) {
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  const payload = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  const insertResult = await insertWebhookEventRecord({
    event_created_at: new Date(event.created * 1000).toISOString(),
    event_type: event.type,
    livemode: event.livemode,
    payload: event,
    status: "received",
    stripe_account_id: PLATFORM_ACCOUNT_ID,
    stripe_event_id: event.id,
    user_id: null,
  });
  const claimToken = crypto.randomUUID();
  const claimedEvent = await claimWebhookEvent(event.id, claimToken);

  if (!claimedEvent) {
    const storedEvent = await getWebhookEventRecord(event.id);
    const disposition = getWebhookClaimDisposition(storedEvent?.status ?? null);

    if (disposition === "completed") {
      return NextResponse.json({ duplicate: !insertResult.inserted, received: true });
    }

    const retryAfter = disposition === "in_progress" ? 5 : 30;
    return NextResponse.json(
      { received: false, retry: true },
      {
        headers: { "Retry-After": String(retryAfter) },
        status: disposition === "in_progress" ? 409 : RETRY_RESPONSE_STATUS,
      },
    );
  }

  try {
    if (
      event.type !== "checkout.session.completed" &&
      event.type !== "checkout.session.async_payment_succeeded"
    ) {
      await completeWebhookEvent({
        claimToken,
        ignoredReason: "unsupported_billing_event",
        outcome: "ignored",
        stripeEventId: event.id,
      });
      return NextResponse.json({ ignored: true, received: true });
    }

    const session = event.data.object as Stripe.Checkout.Session;

    if (!isPaidFoundingMemberSession(session)) {
      await completeWebhookEvent({
        claimToken,
        ignoredReason: "not_paid_founding_member_checkout",
        outcome: "ignored",
        stripeEventId: event.id,
      });
      return NextResponse.json({ ignored: true, received: true });
    }

    const customerEmail = getCustomerEmail(session);

    if (!customerEmail) {
      throw new Error("Paid Checkout Session does not contain a customer email.");
    }

    await sendFoundingMemberWelcome({
      checkoutSessionId: session.id,
      customerEmail,
      customerName: session.customer_details?.name?.trim() || null,
    });
    await completeWebhookEvent({
      claimToken,
      outcome: "processed",
      stripeEventId: event.id,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    const sanitizedError = sanitizeWebhookError(error);
    const retryDelaySeconds = getWebhookRetryDelaySeconds(
      claimedEvent.processing_attempt_count,
    );

    await completeWebhookEvent({
      claimToken,
      errorCode: sanitizedError.code,
      errorDetails: sanitizedError.details,
      nextAttemptAt: new Date(Date.now() + retryDelaySeconds * 1000).toISOString(),
      outcome: "failed",
      stripeEventId: event.id,
    });

    return NextResponse.json(
      { error: "Billing webhook processing failed.", retry: true },
      {
        headers: { "Retry-After": String(retryDelaySeconds) },
        status: RETRY_RESPONSE_STATUS,
      },
    );
  }
}
