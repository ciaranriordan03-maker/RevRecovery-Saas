import Stripe from "stripe";
import { NextResponse } from "next/server";
import {
  getStripeConnectionForAccount,
  updateStripeConnectionStatus,
} from "../../../../lib/server/stripe-connections";
import {
  ensureRecoverySequenceForFailedPayment,
  resolveRecoverySequenceForFailedPayment,
} from "../../../../lib/server/recovery-sequences";
import {
  recordPaymentMethodUpdated,
  recordSubscriptionState,
} from "../../../../lib/server/stripe-customer-states";
import {
  insertWebhookEventRecord,
  markWebhookEventProcessed,
  upsertFailedPayment,
} from "../../../../lib/server/stripe-webhooks";
import { getStripeSecretKey } from "../../../../lib/stripe/env";

export const runtime = "nodejs";

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

function getInvoiceSubscriptionId(invoice: Stripe.Invoice) {
  const invoiceWithSubscription = invoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
  };
  const subscription = invoiceWithSubscription.subscription;

  if (!subscription) {
    return null;
  }

  return typeof subscription === "string" ? subscription : subscription.id;
}

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  stripeAccountId: string,
  userId: string,
) {
  const failedPayment = await upsertFailedPayment({
    amount_due: invoice.amount_due,
    attempt_count: invoice.attempt_count,
    currency: invoice.currency,
    last_event_type: "invoice.payment_failed",
    latest_payload: invoice,
    next_payment_attempt_at: toIsoTimestamp(invoice.next_payment_attempt),
    recovery_stage: "email_1_pending",
    status: "failed",
    stripe_account_id: stripeAccountId,
    stripe_customer_id: getCustomerId(invoice.customer),
    stripe_invoice_id: invoice.id,
    stripe_subscription_id: getInvoiceSubscriptionId(invoice),
    user_id: userId,
  });

  await ensureRecoverySequenceForFailedPayment(failedPayment);
  return failedPayment;
}

async function handleInvoiceRecovered(
  invoice: Stripe.Invoice,
  stripeAccountId: string,
  userId: string,
  eventType: "invoice.paid" | "invoice.payment_succeeded",
) {
  const failedPayment = await upsertFailedPayment({
    amount_due: invoice.amount_due,
    attempt_count: invoice.attempt_count,
    currency: invoice.currency,
    last_event_type: eventType,
    latest_payload: invoice,
    next_payment_attempt_at: toIsoTimestamp(invoice.next_payment_attempt),
    recovered_at: new Date().toISOString(),
    recovery_stage: "recovered",
    status: "recovered",
    stripe_account_id: stripeAccountId,
    stripe_customer_id: getCustomerId(invoice.customer),
    stripe_invoice_id: invoice.id,
    stripe_subscription_id: getInvoiceSubscriptionId(invoice),
    user_id: userId,
  });

  await resolveRecoverySequenceForFailedPayment(
    failedPayment.id,
    failedPayment.recovered_at ?? new Date().toISOString(),
  );

  return failedPayment;
}

async function handleInvoiceUpdated(
  invoice: Stripe.Invoice,
  stripeAccountId: string,
  userId: string,
) {
  if (!invoice.id || invoice.amount_due <= 0) {
    return null;
  }

  return upsertFailedPayment({
    amount_due: invoice.amount_due,
    attempt_count: invoice.attempt_count,
    currency: invoice.currency,
    last_event_type: "invoice.updated",
    latest_payload: invoice,
    next_payment_attempt_at: toIsoTimestamp(invoice.next_payment_attempt),
    recovery_stage: invoice.status === "paid" ? "recovered" : "awaiting_retry",
    status: invoice.status === "paid" ? "recovered" : "open",
    stripe_account_id: stripeAccountId,
    stripe_customer_id: getCustomerId(invoice.customer),
    stripe_invoice_id: invoice.id,
    stripe_subscription_id: getInvoiceSubscriptionId(invoice),
    user_id: userId,
  });
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
    livemode: event.livemode,
    payload: event,
    status: "received",
    stripe_account_id: stripeAccountId,
    stripe_event_id: event.id,
    user_id: userId,
  });

  if (!insertResult.inserted) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    if (event.type === "account.application.deauthorized") {
      await handleDeauthorization(stripeAccountId);
    } else if (userId) {
      switch (event.type) {
        case "invoice.payment_failed":
          await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, stripeAccountId, userId);
          break;
        case "invoice.paid":
        case "invoice.payment_succeeded":
          await handleInvoiceRecovered(
            event.data.object as Stripe.Invoice,
            stripeAccountId,
            userId,
            event.type,
          );
          break;
        case "invoice.updated":
          await handleInvoiceUpdated(event.data.object as Stripe.Invoice, stripeAccountId, userId);
          break;
        case "customer.subscription.deleted":
        case "customer.subscription.updated":
          await recordSubscriptionState({
            eventType: event.type,
            stripeAccountId,
            subscription: event.data.object as Stripe.Subscription,
            userId,
          });
          break;
        case "payment_method.updated":
          await recordPaymentMethodUpdated({
            paymentMethod: event.data.object as Stripe.PaymentMethod,
            stripeAccountId,
            userId,
          });
          break;
        default:
          break;
      }
    }

    await markWebhookEventProcessed(event.id, "processed");
    return NextResponse.json({ received: true });
  } catch (error) {
    await markWebhookEventProcessed(
      event.id,
      "failed",
      error instanceof Error ? error.message : "Webhook processing failed.",
    );

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Webhook processing failed.",
      },
      { status: 500 },
    );
  }
}
