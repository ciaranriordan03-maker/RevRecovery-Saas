import Stripe from "stripe";
import { NextResponse } from "next/server";
import {
  getStripeConnectionForAccount,
  updateStripeConnectionStatus,
} from "../../../../lib/server/stripe-connections";
import {
  ensureRecoverySequenceForFailedPayment,
} from "../../../../lib/server/recovery-sequences";
import {
  recordPaymentMethodUpdated,
  recordSubscriptionState,
} from "../../../../lib/server/stripe-customer-states";
import {
  claimWebhookEvent,
  completeWebhookEvent,
  getFailedPaymentForInvoice,
  getWebhookEventRecord,
  insertWebhookEventRecord,
  pauseRecoveryCasesForPaymentMethod,
  recordStripeInvoiceEvent,
} from "../../../../lib/server/stripe-webhooks";
import { getStripeSecretKey } from "../../../../lib/stripe/env";
import {
  decideInvoiceEvent,
  getInvoiceKind,
  getInvoicePaymentContext,
  getInvoiceSubscriptionId,
} from "../../../../lib/stripe/recovery-state";
import {
  getWebhookClaimDisposition,
  getWebhookRetryDelaySeconds,
  sanitizeWebhookError,
} from "../../../../lib/stripe/webhook-processing";
import { getWebhookEnvironmentDisposition } from "../../../../lib/stripe/webhook-environment";

const RETRY_RESPONSE_STATUS = 503;

function getWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET ?? null;
}

function createStripeWebhookClient() {
  const secretKey = getStripeSecretKey();

  if (!secretKey) {
    return null;
  }

  return new Stripe(secretKey);
}

function toIsoTimestamp(epochSeconds: number | null | undefined) {
  if (!epochSeconds) {
    return null;
  }

  return new Date(epochSeconds * 1000).toISOString();
}

function getCustomerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null) {
  if (!customer) {
    return null;
  }

  return typeof customer === "string" ? customer : customer.id;
}

async function handleInvoiceEvent(
  event: Stripe.Event,
  invoice: Stripe.Invoice,
  stripeAccountId: string,
  userId: string,
) {
  const eventType = event.type as
    | "invoice.paid"
    | "invoice.payment_failed"
    | "invoice.payment_succeeded"
    | "invoice.updated";
  const existingCase = await getFailedPaymentForInvoice({
    livemode: event.livemode,
    stripeAccountId,
    stripeInvoiceId: invoice.id,
  });
  const decision = decideInvoiceEvent(eventType, invoice.status, Boolean(existingCase));

  if (!decision.createsCase && !existingCase) {
    return null;
  }

  const paymentContext = getInvoicePaymentContext(invoice);
  const failedPayment = await recordStripeInvoiceEvent({
    amountDue: invoice.amount_due,
    amountPaid: invoice.amount_paid,
    attemptCount: invoice.attempt_count,
    billingReason: invoice.billing_reason,
    currency: invoice.currency,
    declineCode: paymentContext.declineCode,
    eventCreatedAt: toIsoTimestamp(event.created) ?? new Date().toISOString(),
    eventType,
    failureCode: paymentContext.failureCode,
    failureMessage: paymentContext.failureMessage,
    invoiceKind: getInvoiceKind(invoice),
    invoiceStatus: invoice.status,
    livemode: event.livemode,
    nextPaymentAttemptAt: toIsoTimestamp(invoice.next_payment_attempt),
    payload: invoice,
    stripeAccountId,
    stripeChargeId: paymentContext.stripeChargeId,
    stripeCustomerId: getCustomerId(invoice.customer),
    stripeEventId: event.id,
    stripeInvoiceId: invoice.id,
    stripePaymentIntentId: paymentContext.stripePaymentIntentId,
    stripeSubscriptionId: getInvoiceSubscriptionId(invoice),
    targetStatus: decision.targetStatus,
    terminalReason: decision.terminalReason,
    userId,
  });

  if (failedPayment?.case_status === "active") {
    await ensureRecoverySequenceForFailedPayment(failedPayment);
  }

  return failedPayment;
}

async function handleDeauthorization(stripeAccountId: string) {
  await updateStripeConnectionStatus(stripeAccountId, "deauthorized");
}

export async function POST(request: Request) {
  const webhookSecret = getWebhookSecret();
  const stripe = createStripeWebhookClient();
  const signature = request.headers.get("stripe-signature");

  if (!webhookSecret || !stripe || !signature) {
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 500 });
  }

  const payload = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Invalid Stripe signature.",
      },
      { status: 400 },
    );
  }

  const stripeAccountId = event.account ?? null;

  if (!stripeAccountId) {
    return NextResponse.json({ error: "Missing connected account." }, { status: 400 });
  }

  const connection = await getStripeConnectionForAccount(stripeAccountId);
  const userId = connection?.user_id ?? null;

  const insertResult = await insertWebhookEventRecord({
    event_type: event.type,
    event_created_at: toIsoTimestamp(event.created),
    livemode: event.livemode,
    payload: event,
    status: "received",
    stripe_account_id: stripeAccountId,
    stripe_event_id: event.id,
    user_id: userId,
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
    const environmentDisposition = getWebhookEnvironmentDisposition(
      connection?.livemode,
      event.livemode,
    );

    if (environmentDisposition !== "process") {
      await completeWebhookEvent({
        claimToken,
        ignoredReason: environmentDisposition,
        outcome: "ignored",
        stripeEventId: event.id,
      });
      return NextResponse.json({
        ignored: true,
        reason: environmentDisposition,
        received: true,
      });
    }

    if (event.type === "account.application.deauthorized") {
      await handleDeauthorization(stripeAccountId);
    } else if (userId) {
      switch (event.type) {
        case "invoice.payment_failed":
        case "invoice.paid":
        case "invoice.payment_succeeded":
        case "invoice.updated":
          await handleInvoiceEvent(
            event,
            event.data.object as Stripe.Invoice,
            stripeAccountId,
            userId,
          );
          break;
        case "customer.subscription.deleted":
        case "customer.subscription.updated":
          await recordSubscriptionState({
            eventType: event.type,
            livemode: event.livemode,
            stripeAccountId,
            subscription: event.data.object as Stripe.Subscription,
            userId,
          });
          break;
        case "payment_method.updated": {
          const paymentMethod = event.data.object as Stripe.PaymentMethod;
          await recordPaymentMethodUpdated({
            livemode: event.livemode,
            paymentMethod,
            stripeAccountId,
            userId,
          });
          const paymentMethodCustomerId = getCustomerId(paymentMethod.customer);

          if (paymentMethodCustomerId) {
            await pauseRecoveryCasesForPaymentMethod({
              eventCreatedAt: toIsoTimestamp(event.created) ?? new Date().toISOString(),
              livemode: event.livemode,
              stripeAccountId,
              stripeCustomerId: paymentMethodCustomerId,
              stripeEventId: event.id,
              userId,
            });
          }
          break;
        }
        default:
          break;
      }
    }

    await completeWebhookEvent({
      claimToken,
      outcome: userId || event.type === "account.application.deauthorized" ? "processed" : "ignored",
      ignoredReason: userId ? undefined : "connected_account_not_found",
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
      { error: "Webhook processing failed.", retry: true },
      {
        headers: { "Retry-After": String(retryDelaySeconds) },
        status: RETRY_RESPONSE_STATUS,
      },
    );
  }
}
