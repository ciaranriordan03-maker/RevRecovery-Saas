import "server-only";

import Stripe from "stripe";
import { createSupabaseAdminClient } from "../supabase/admin";
import { getAppUrl } from "../stripe/env";
import { createStripePlatformClient } from "../stripe/server";
import { getUserSettings } from "./settings-store";
import { resolveRecoverySequenceForFailedPayment } from "./recovery-sequences";
import { getStripeCustomerState } from "./stripe-customer-states";

type FailedPaymentRecord = {
  amount_due: number;
  attempt_count: number;
  created_at: string;
  currency: string | null;
  id: string;
  last_event_type: string;
  latest_payload: Stripe.Invoice | Stripe.Subscription | Stripe.PaymentMethod;
  next_payment_attempt_at: string | null;
  recovered_at: string | null;
  recovery_stage: string;
  status: string;
  stripe_account_id: string;
  stripe_customer_id: string | null;
  stripe_invoice_id: string;
  stripe_subscription_id: string | null;
  updated_at: string;
  user_id: string;
};

type RecoveryMessageRecord = {
  body_preview: string | null;
  channel: string;
  failed_payment_id: string;
  id: string;
  last_error: string | null;
  message_key: string;
  metadata: Record<string, unknown>;
  provider_message_id: string | null;
  scheduled_for: string;
  send_attempt_count: number;
  sent_to_email: string | null;
  sequence_id: string;
  status: string;
  step_number: number;
  subject: string | null;
  user_id: string;
};

type ProcessRecoveryMessagesResult = {
  canceled: number;
  failed: number;
  processed: number;
  sent: number;
};

type RecoverySequenceStatus = {
  status: string;
};

type StripeStopCheckResult =
  | {
      canSend: true;
      latestInvoice: Stripe.Invoice;
    }
  | {
      canSend: false;
      reason: string;
      recovered: boolean;
    };

const FAILED_PAYMENTS_TABLE = "failed_payments";
const RECOVERY_MESSAGES_TABLE = "recovery_messages";
const RECOVERY_SEQUENCES_TABLE = "recovery_sequences";

export type RecoveryEmailVariables = {
  amountDue: number;
  customerEmail: string | null;
  customerFirstName: string | null;
  customerFullName: string | null;
  formattedAmount: string;
  greeting: string;
  invoiceId: string;
  portalUrl: string;
};

function getResendApiKey() {
  return process.env.RESEND_API_KEY ?? null;
}

function getRecoveryEmailFrom() {
  const from = process.env.RECOVERY_EMAIL_FROM?.trim();

  if (!from) {
    return null;
  }

  if (
    (from.startsWith('"') && from.endsWith('"')) ||
    (from.startsWith("'") && from.endsWith("'"))
  ) {
    return from.slice(1, -1).trim();
  }

  return from;
}

function buildPortalUrl() {
  return getAppUrl();
}

function formatCurrency(amountDue: number, currency: string | null) {
  return new Intl.NumberFormat("en-US", {
    currency: (currency ?? "USD").toUpperCase(),
    style: "currency",
  }).format(amountDue / 100);
}

function sanitizeName(value: string | null | undefined) {
  const normalized = value?.trim().replace(/\s+/g, " ");

  if (!normalized || normalized.includes("@")) {
    return null;
  }

  return normalized;
}

function getFirstName(fullName: string | null) {
  return fullName?.split(" ").filter(Boolean)[0] ?? null;
}

function getCustomerNameFromPayload(payload: FailedPaymentRecord["latest_payload"]) {
  if ("customer_name" in payload && typeof payload.customer_name === "string") {
    return sanitizeName(payload.customer_name);
  }

  if ("customer" in payload && payload.customer && typeof payload.customer === "object") {
    const customer = payload.customer as Stripe.Customer | Stripe.DeletedCustomer;

    if ("deleted" in customer && customer.deleted) {
      return null;
    }

    if ("name" in customer && typeof customer.name === "string") {
      return sanitizeName(customer.name);
    }
  }

  return null;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function buildRecoveryEmailVariables({
  amountDue,
  currency,
  latestInvoice,
  originalPayload,
}: {
  amountDue: number;
  currency: string | null;
  latestInvoice: Stripe.Invoice | null;
  originalPayload: FailedPaymentRecord["latest_payload"];
}): RecoveryEmailVariables {
  const customerFullName =
    getCustomerNameFromPayload(latestInvoice ?? originalPayload) ??
    getCustomerNameFromPayload(originalPayload);
  const customerFirstName = getFirstName(customerFullName);
  const customerEmail =
    getInvoiceCustomerEmail(latestInvoice) ??
    getInvoiceCustomerEmail(originalPayload);

  return {
    amountDue,
    customerEmail,
    customerFirstName,
    customerFullName,
    formattedAmount: formatCurrency(amountDue, currency),
    greeting: customerFirstName ? `Hi ${customerFirstName},` : "Hi there,",
    invoiceId:
      latestInvoice?.id ??
      ("id" in originalPayload && typeof originalPayload.id === "string"
        ? originalPayload.id
        : "unknown"),
    portalUrl: `${buildPortalUrl()}/dashboard/recovery`,
  };
}

export function buildMessageCopy(
  stepNumber: number,
  tone: string,
  variables: RecoveryEmailVariables,
) {
  const safeGreeting = escapeHtml(variables.greeting);
  const safeFormattedAmount = escapeHtml(variables.formattedAmount);
  const safePortalUrl = escapeHtml(variables.portalUrl);

  const tonePrefix =
    tone === "Urgent"
      ? "Your payment still needs attention."
      : tone === "Professional"
        ? "We were unable to process your latest payment."
        : "Just a quick heads-up that your last payment didn’t go through.";

  const stepBody =
    stepNumber === 1
      ? "Please update your billing details so we can retry the charge and keep your account uninterrupted."
      : stepNumber === 2
        ? "We’ll retry the payment soon. Updating your payment method now gives you the best chance of avoiding any interruption."
        : "This is the final reminder before your account may be affected. Please update your billing details today.";

  return {
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: rgb(17 24 39);">
        <p>${safeGreeting}</p>
        <p>${tonePrefix}</p>
        <p>${stepBody}</p>
        <p><strong>Outstanding amount:</strong> ${safeFormattedAmount}</p>
        <p><a href="${safePortalUrl}" style="display:inline-block;padding:12px 18px;background:rgb(91 76 240);color:white;text-decoration:none;border-radius:8px;">Update billing details</a></p>
        <p>If you’ve already taken care of this, you can ignore this email.</p>
      </div>
    `.trim(),
    text: `${variables.greeting}\n\n${tonePrefix}\n\n${stepBody}\n\nOutstanding amount: ${variables.formattedAmount}\n\nUpdate billing details: ${variables.portalUrl}\n\nIf you've already taken care of this, you can ignore this email.`,
  };
}

function getInvoiceCustomerEmail(
  latestPayload: FailedPaymentRecord["latest_payload"] | Stripe.Invoice | null,
) {
  if (!latestPayload) {
    return null;
  }

  if ("customer_email" in latestPayload && typeof latestPayload.customer_email === "string") {
    return latestPayload.customer_email;
  }

  if ("customer" in latestPayload && latestPayload.customer && typeof latestPayload.customer === "object") {
    const customer = latestPayload.customer as Stripe.Customer | Stripe.DeletedCustomer;

    if ("deleted" in customer && customer.deleted) {
      return null;
    }

    if ("email" in customer && typeof customer.email === "string") {
      return customer.email;
    }
  }

  return null;
}

async function getPendingRecoveryMessages(limit: number) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { data, error } = await supabase
    .from(RECOVERY_MESSAGES_TABLE)
    .select(
      "id, sequence_id, failed_payment_id, user_id, message_key, channel, step_number, subject, body_preview, scheduled_for, status, provider_message_id, metadata, send_attempt_count, last_error, sent_to_email",
    )
    .eq("status", "pending")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(limit)
    .returns<RecoveryMessageRecord[]>();

  if (error) {
    throw new Error(`Unable to load pending recovery messages: ${error.message}`);
  }

  return data ?? [];
}

async function getFailedPaymentById(id: string) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { data, error } = await supabase
    .from(FAILED_PAYMENTS_TABLE)
    .select(
      "id, user_id, stripe_account_id, stripe_customer_id, stripe_subscription_id, stripe_invoice_id, amount_due, currency, attempt_count, next_payment_attempt_at, status, recovery_stage, recovered_at, last_event_type, latest_payload, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle<FailedPaymentRecord>();

  if (error) {
    throw new Error(`Unable to load failed payment: ${error.message}`);
  }

  return data ?? null;
}

async function getRecoverySequenceStatus(sequenceId: string) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { data, error } = await supabase
    .from(RECOVERY_SEQUENCES_TABLE)
    .select("status")
    .eq("id", sequenceId)
    .maybeSingle<RecoverySequenceStatus>();

  if (error) {
    throw new Error(`Unable to load recovery sequence: ${error.message}`);
  }

  return data;
}

async function markFailedPaymentRecovered(
  failedPayment: FailedPaymentRecord,
  latestInvoice: Stripe.Invoice,
  recoveredAt: string,
) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { error } = await supabase
    .from(FAILED_PAYMENTS_TABLE)
    .update({
      attempt_count: latestInvoice.attempt_count,
      latest_payload: latestInvoice,
      next_payment_attempt_at: toIsoTimestamp(latestInvoice.next_payment_attempt),
      recovered_at: recoveredAt,
      recovery_stage: "recovered",
      status: "recovered",
    })
    .eq("id", failedPayment.id);

  if (error) {
    throw new Error(`Unable to mark failed payment recovered: ${error.message}`);
  }
}

function toIsoTimestamp(epochSeconds: number | null | undefined) {
  if (!epochSeconds) {
    return null;
  }

  return new Date(epochSeconds * 1000).toISOString();
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

function isInvoiceRecovered(invoice: Stripe.Invoice) {
  return invoice.status === "paid" || invoice.amount_remaining <= 0;
}

function isInvoiceActionable(invoice: Stripe.Invoice) {
  return invoice.status === "open" && invoice.amount_remaining > 0;
}

function isSubscriptionHealthy(subscription: Stripe.Subscription) {
  return subscription.status === "active" || subscription.status === "trialing";
}

async function getPaymentMethodUpdatePauseReason(failedPayment: FailedPaymentRecord) {
  if (!failedPayment.stripe_customer_id) {
    return null;
  }

  const customerState = await getStripeCustomerState({
    stripeAccountId: failedPayment.stripe_account_id,
    stripeCustomerId: failedPayment.stripe_customer_id,
    userId: failedPayment.user_id,
  });
  const paymentMethodUpdatedAt = customerState?.payment_method_updated_at;

  if (!paymentMethodUpdatedAt) {
    return null;
  }

  const paymentMethodUpdatedAtMs = new Date(paymentMethodUpdatedAt).getTime();
  const failedPaymentUpdatedAtMs = new Date(failedPayment.updated_at).getTime();

  if (!Number.isFinite(paymentMethodUpdatedAtMs) || !Number.isFinite(failedPaymentUpdatedAtMs)) {
    return null;
  }

  if (paymentMethodUpdatedAtMs >= failedPaymentUpdatedAtMs) {
    return "Customer updated their payment method. Recovery email paused until Stripe retry status updates.";
  }

  return null;
}

async function checkLiveStripeStopConditions(
  failedPayment: FailedPaymentRecord,
): Promise<StripeStopCheckResult> {
  const paymentMethodPauseReason = await getPaymentMethodUpdatePauseReason(failedPayment);

  if (paymentMethodPauseReason) {
    return {
      canSend: false,
      reason: paymentMethodPauseReason,
      recovered: false,
    };
  }

  const stripe = createStripePlatformClient();

  if (!stripe) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  const latestInvoice = await stripe.invoices.retrieve(
    failedPayment.stripe_invoice_id,
    {
      expand: ["customer"],
    },
    {
      stripeAccount: failedPayment.stripe_account_id,
    },
  );

  if (isInvoiceRecovered(latestInvoice)) {
    const recoveredAt = new Date().toISOString();
    await markFailedPaymentRecovered(failedPayment, latestInvoice, recoveredAt);
    await resolveRecoverySequenceForFailedPayment(failedPayment.id, recoveredAt);

    return {
      canSend: false,
      reason: "Stripe invoice is already paid.",
      recovered: true,
    };
  }

  if (!isInvoiceActionable(latestInvoice)) {
    return {
      canSend: false,
      reason: `Stripe invoice is no longer actionable (${latestInvoice.status ?? "unknown"}).`,
      recovered: false,
    };
  }

  const subscriptionId =
    failedPayment.stripe_subscription_id ?? getInvoiceSubscriptionId(latestInvoice);

  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(
      subscriptionId,
      {},
      {
        stripeAccount: failedPayment.stripe_account_id,
      },
    );

    if (isSubscriptionHealthy(subscription)) {
      return {
        canSend: false,
        reason: `Stripe subscription is healthy (${subscription.status}).`,
        recovered: false,
      };
    }
  }

  return {
    canSend: true,
    latestInvoice,
  };
}

async function cancelRecoveryMessage(id: string, reason: string) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { error } = await supabase
    .from(RECOVERY_MESSAGES_TABLE)
    .update({
      canceled_at: new Date().toISOString(),
      last_error: reason,
      status: "canceled",
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Unable to cancel recovery message: ${error.message}`);
  }
}

async function markRecoveryMessageSent(
  messageId: string,
  previousAttemptCount: number,
  providerMessageId: string | null,
  sentToEmail: string,
) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { error } = await supabase
    .from(RECOVERY_MESSAGES_TABLE)
    .update({
      last_error: null,
      provider_message_id: providerMessageId,
      send_attempt_count: previousAttemptCount + 1,
      sent_at: new Date().toISOString(),
      sent_to_email: sentToEmail,
      status: "sent",
    })
    .eq("id", messageId);

  if (error) {
    throw new Error(`Unable to mark recovery message sent: ${error.message}`);
  }
}

async function markRecoveryMessageFailed(
  messageId: string,
  previousAttemptCount: number,
  errorMessage: string,
) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const nextAttemptCount = previousAttemptCount + 1;
  const nextStatus = nextAttemptCount >= 3 ? "failed" : "pending";

  const { error } = await supabase
    .from(RECOVERY_MESSAGES_TABLE)
    .update({
      last_error: errorMessage,
      send_attempt_count: nextAttemptCount,
      status: nextStatus,
    })
    .eq("id", messageId);

  if (error) {
    throw new Error(`Unable to mark recovery message failed: ${error.message}`);
  }
}

async function updateSequenceProgress(sequenceId: string, stepNumber: number) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { error } = await supabase
    .from(RECOVERY_SEQUENCES_TABLE)
    .update({
      current_step: stepNumber,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sequenceId);

  if (error) {
    throw new Error(`Unable to update recovery sequence progress: ${error.message}`);
  }
}

async function sendWithResend({
  from,
  html,
  replyTo,
  subject,
  text,
  to,
}: {
  from: string;
  html: string;
  replyTo: string | null;
  subject: string;
  text: string;
  to: string;
}) {
  const apiKey = getResendApiKey();

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from,
      html,
      reply_to: replyTo ?? undefined,
      subject,
      text,
      to: [to],
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Resend request failed: ${response.status} ${errorBody}`);
  }

  const json = (await response.json()) as { id?: string };
  return json.id ?? null;
}

export async function processPendingRecoveryMessages(limit = 25): Promise<ProcessRecoveryMessagesResult> {
  const result: ProcessRecoveryMessagesResult = {
    canceled: 0,
    failed: 0,
    processed: 0,
    sent: 0,
  };

  const messages = await getPendingRecoveryMessages(limit);

  for (const message of messages) {
    result.processed += 1;

    try {
      const failedPayment = await getFailedPaymentById(message.failed_payment_id);

      if (!failedPayment) {
        await cancelRecoveryMessage(message.id, "Failed payment record no longer exists.");
        result.canceled += 1;
        continue;
      }

      if (failedPayment.status === "recovered" || failedPayment.recovered_at) {
        await cancelRecoveryMessage(message.id, "Payment has already been recovered.");
        result.canceled += 1;
        continue;
      }

      const sequence = await getRecoverySequenceStatus(message.sequence_id);

      if (!sequence || sequence.status !== "active") {
        await cancelRecoveryMessage(
          message.id,
          sequence
            ? `Recovery sequence is not active (${sequence.status}).`
            : "Recovery sequence no longer exists.",
        );
        result.canceled += 1;
        continue;
      }

      const stopCheck = await checkLiveStripeStopConditions(failedPayment);

      if (!stopCheck.canSend) {
        await cancelRecoveryMessage(message.id, stopCheck.reason);
        result.canceled += 1;
        continue;
      }

      const recipientEmail =
        getInvoiceCustomerEmail(stopCheck.latestInvoice) ??
        getInvoiceCustomerEmail(failedPayment.latest_payload);

      if (!recipientEmail) {
        await markRecoveryMessageFailed(message.id, message.send_attempt_count, "No customer email found on invoice payload.");
        result.failed += 1;
        continue;
      }

      const settingsRecord = await getUserSettings(message.user_id);
      const emailSettings = settingsRecord.settings.email;
      const variables = buildRecoveryEmailVariables({
        amountDue: failedPayment.amount_due,
        currency: failedPayment.currency,
        latestInvoice: stopCheck.latestInvoice,
        originalPayload: failedPayment.latest_payload,
      });
      const copy = buildMessageCopy(
        message.step_number,
        settingsRecord.settings.recovery.defaultEmailTone,
        variables,
      );

      const from =
        getRecoveryEmailFrom() ??
        `${emailSettings.senderName} <${emailSettings.supportEmail}>`;

      const providerMessageId = await sendWithResend({
        from,
        html: copy.html,
        replyTo: emailSettings.replyToEmail,
        subject: message.subject ?? `Payment reminder for invoice ${failedPayment.stripe_invoice_id}`,
        text: copy.text,
        to: recipientEmail,
      });

      await markRecoveryMessageSent(
        message.id,
        message.send_attempt_count,
        providerMessageId,
        recipientEmail,
      );
      await updateSequenceProgress(message.sequence_id, message.step_number);
      result.sent += 1;
    } catch (error) {
      await markRecoveryMessageFailed(
        message.id,
        message.send_attempt_count,
        error instanceof Error ? error.message : "Unknown recovery email error.",
      );
      result.failed += 1;
    }
  }

  return result;
}
