import "server-only";

import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import {
  classifyDeliveryHttpFailure,
  getRecoveryDeliveryNextAttemptAt,
  shouldRetryRecoveryDelivery,
  type DeliveryFailureDisposition,
} from "../recovery/delivery-policy";
import {
  getRecoveryDeliveryRecipient,
  isRecoveryDeliveryKillSwitchEnabled,
} from "../recovery/mode-policy";
import { RECOVERY_MESSAGE_COPY_VERSION } from "../recovery/message-templates";
import { createSupabaseAdminClient } from "../supabase/admin";
import { createStripePlatformClient } from "../stripe/server";
import { getUserSettings } from "./settings-store";
import { getRecoveryAccountRuntimeSettings } from "./recovery-account-settings";
import { resolveRecoverySequenceForFailedPayment } from "./recovery-sequences";
import { getStripeCustomerState } from "./stripe-customer-states";

type FailedPaymentRecord = {
  amount_due: number;
  attempt_count: number;
  created_at: string;
  currency: string | null;
  case_status: string | null;
  id: string;
  last_event_type: string;
  latest_payload: Stripe.Invoice | Stripe.Subscription | Stripe.PaymentMethod;
  livemode: boolean | null;
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
  claim_token: string | null;
  delivery_generation: number;
  failed_payment_id: string;
  id: string;
  last_error: string | null;
  message_key: string;
  metadata: Record<string, unknown>;
  provider_message_id: string | null;
  provider_idempotency_key: string;
  scheduled_for: string;
  send_attempt_count: number;
  sent_to_email: string | null;
  sequence_id: string;
  status: string;
  step_number: number;
  subject: string | null;
  user_id: string;
};

type DeliveryCompletionOutcome =
  | "sent"
  | "failed_retryable"
  | "failed_terminal";

class RecoveryDeliveryError extends Error {
  code: string;
  disposition: DeliveryFailureDisposition;

  constructor({
    code,
    disposition,
    message,
  }: {
    code: string;
    disposition: DeliveryFailureDisposition;
    message: string;
  }) {
    super(message);
    this.name = "RecoveryDeliveryError";
    this.code = code;
    this.disposition = disposition;
  }
}

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
      disposition: "cancel" | "pause";
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

export function getRecoveryEmailFrom() {
  const from = process.env.RECOVERY_EMAIL_FROM?.trim();

  if (!from) {
    return null;
  }

  if (
    (from.startsWith('"') && from.endsWith('"')) ||
    (from.startsWith("'") && from.endsWith("'"))
  ) {
    return normalizeLegacySenderName(from.slice(1, -1).trim());
  }

  return normalizeLegacySenderName(from);
}

function normalizeLegacySenderName(from: string) {
  return from.replace(/^(RecoverFlow(?: Team)?)(?=\s*<)/i, "RevRecovery");
}

export function getHostedInvoiceUrl(invoice: Stripe.Invoice | null) {
  const hostedInvoiceUrl = invoice?.hosted_invoice_url?.trim();

  if (!hostedInvoiceUrl) {
    return null;
  }

  try {
    const url = new URL(hostedInvoiceUrl);
    const isStripeHost =
      url.hostname === "stripe.com" || url.hostname.endsWith(".stripe.com");

    if (url.protocol !== "https:" || !isStripeHost) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
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
  const hostedInvoiceUrl = getHostedInvoiceUrl(latestInvoice);

  if (!hostedInvoiceUrl) {
    throw new Error(
      "Stripe did not provide a secure hosted invoice URL for this payment.",
    );
  }

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
    portalUrl: hostedInvoiceUrl,
  };
}

export function buildMessageCopy(
  stepNumber: number,
  tone: string,
  variables: RecoveryEmailVariables,
  customBody?: string,
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

  const customBodyText = customBody?.trim();
  const messageBodyHtml = customBodyText
    ? `<p>${escapeHtml(customBodyText).replace(/\r?\n/g, "<br />")}</p>`
    : `<p>${tonePrefix}</p>\n        <p>${stepBody}</p>`;
  const messageBodyText = customBodyText ?? `${tonePrefix}\n\n${stepBody}`;

  return {
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: rgb(17 24 39);">
        <p>${safeGreeting}</p>
        ${messageBodyHtml}
        <p><strong>Outstanding amount:</strong> ${safeFormattedAmount}</p>
        <p><a href="${safePortalUrl}" style="display:inline-block;padding:12px 18px;background:rgb(91 76 240);color:white;text-decoration:none;border-radius:8px;">Update billing details</a></p>
        <p>If you’ve already taken care of this, you can ignore this email.</p>
      </div>
    `.trim(),
    text: `${variables.greeting}\n\n${messageBodyText}\n\nOutstanding amount: ${variables.formattedAmount}\n\nUpdate billing details: ${variables.portalUrl}\n\nIf you've already taken care of this, you can ignore this email.`,
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

async function claimDueRecoveryMessages(limit: number, claimToken: string) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { data, error } = await supabase.rpc("claim_due_recovery_messages", {
    batch_size: limit,
    lease_seconds: 120,
    requested_claim_token: claimToken,
  });

  if (error) {
    throw new Error(`Unable to claim due recovery messages: ${error.message}`);
  }

  return (data ?? []) as RecoveryMessageRecord[];
}

async function getFailedPaymentById(id: string) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { data, error } = await supabase
    .from(FAILED_PAYMENTS_TABLE)
    .select(
      "id, user_id, stripe_account_id, stripe_customer_id, stripe_subscription_id, stripe_invoice_id, amount_due, currency, attempt_count, next_payment_attempt_at, status, recovery_stage, case_status, recovered_at, last_event_type, latest_payload, livemode, created_at, updated_at",
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
      case_status: "recovered",
      terminal_at: recoveredAt,
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

function isInvoiceRecovered(invoice: Stripe.Invoice) {
  return invoice.status === "paid";
}

function isInvoiceActionable(invoice: Stripe.Invoice) {
  return invoice.status === "open" && invoice.amount_remaining > 0;
}

async function getPaymentMethodUpdatePauseReason(failedPayment: FailedPaymentRecord) {
  if (!failedPayment.stripe_customer_id || failedPayment.livemode === null) {
    return null;
  }

  const customerState = await getStripeCustomerState({
    livemode: failedPayment.livemode,
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
      disposition: "pause",
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
      disposition: "cancel",
      reason: "Stripe invoice is already paid.",
      recovered: true,
    };
  }

  if (!isInvoiceActionable(latestInvoice)) {
    return {
      canSend: false,
      disposition: "cancel",
      reason: `Stripe invoice is no longer actionable (${latestInvoice.status ?? "unknown"}).`,
      recovered: false,
    };
  }

  return {
    canSend: true,
    latestInvoice,
  };
}

async function cancelRecoveryMessage(
  id: string,
  claimToken: string,
  reason: string,
) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { error } = await supabase
    .from(RECOVERY_MESSAGES_TABLE)
    .update({
      canceled_at: new Date().toISOString(),
      claim_expires_at: null,
      claim_token: null,
      last_error: reason,
      status: "canceled",
    })
    .eq("id", id)
    .eq("claim_token", claimToken)
    .eq("status", "claimed");

  if (error) {
    throw new Error(`Unable to cancel recovery message: ${error.message}`);
  }
}

async function pauseRecoveryMessage(
  id: string,
  claimToken: string,
  reason: string,
) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { error } = await supabase
    .from(RECOVERY_MESSAGES_TABLE)
    .update({
      claim_token: null,
      claim_expires_at: null,
      last_error: reason,
      status: "paused",
    })
    .eq("id", id)
    .eq("claim_token", claimToken)
    .eq("status", "claimed");

  if (error) {
    throw new Error(`Unable to pause recovery message: ${error.message}`);
  }
}

async function releaseRecoveryMessageForAccountPause(
  id: string,
  claimToken: string,
) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { error } = await supabase
    .from(RECOVERY_MESSAGES_TABLE)
    .update({
      claim_expires_at: null,
      claim_token: null,
      claimed_at: null,
      status: "pending",
    })
    .eq("id", id)
    .eq("claim_token", claimToken)
    .eq("status", "claimed");

  if (error) {
    throw new Error(`Unable to release paused recovery message: ${error.message}`);
  }
}

async function completeRecoveryMessageDelivery({
  claimToken,
  errorCode = null,
  errorDetails = {},
  messageId,
  nextAttemptAt = null,
  outcome,
  providerMessageId = null,
  sentToEmail = null,
}: {
  claimToken: string;
  errorCode?: string | null;
  errorDetails?: Record<string, unknown>;
  messageId: string;
  nextAttemptAt?: string | null;
  outcome: DeliveryCompletionOutcome;
  providerMessageId?: string | null;
  sentToEmail?: string | null;
}) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { data, error } = await supabase.rpc(
    "complete_recovery_message_delivery",
    {
      requested_claim_token: claimToken,
      requested_error_code: errorCode,
      requested_error_details: errorDetails,
      requested_message_id: messageId,
      requested_next_attempt_at: nextAttemptAt,
      requested_outcome: outcome,
      requested_provider_message_id: providerMessageId,
      requested_sent_to_email: sentToEmail,
    },
  );

  if (error) {
    throw new Error(`Unable to complete recovery message delivery: ${error.message}`);
  }

  if (data !== true) {
    throw new Error("Recovery message claim was lost before completion.");
  }
}

async function sendWithResend({
  from,
  html,
  idempotencyKey,
  replyTo,
  subject,
  text,
  to,
}: {
  from: string;
  html: string;
  idempotencyKey: string;
  replyTo: string | null;
  subject: string;
  text: string;
  to: string;
}) {
  const apiKey = getResendApiKey();

  if (!apiKey) {
    throw new RecoveryDeliveryError({
      code: "resend_not_configured",
      disposition: "terminal",
      message: "Recovery email provider is not configured.",
    });
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
      "Idempotency-Key": idempotencyKey,
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new RecoveryDeliveryError({
      code: `resend_http_${response.status}`,
      disposition: classifyDeliveryHttpFailure(response.status),
      message: `Recovery email provider returned HTTP ${response.status}.`,
    });
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

  if (isRecoveryDeliveryKillSwitchEnabled(process.env.RECOVERY_DELIVERY_KILL_SWITCH)) {
    return result;
  }

  const claimToken = randomUUID();
  const messages = await claimDueRecoveryMessages(limit, claimToken);

  for (const message of messages) {
    result.processed += 1;

    try {
      const failedPayment = await getFailedPaymentById(message.failed_payment_id);

      if (!failedPayment) {
        await cancelRecoveryMessage(message.id, claimToken, "Failed payment record no longer exists.");
        result.canceled += 1;
        continue;
      }

      if (failedPayment.status === "recovered" || failedPayment.recovered_at) {
        await cancelRecoveryMessage(message.id, claimToken, "Payment has already been recovered.");
        result.canceled += 1;
        continue;
      }

      const accountSettings = await getRecoveryAccountRuntimeSettings({
        livemode: failedPayment.livemode ?? false,
        stripeAccountId: failedPayment.stripe_account_id,
      });

      if (accountSettings.mode === "off") {
        await cancelRecoveryMessage(message.id, claimToken, "Recovery mode is off.");
        result.canceled += 1;
        continue;
      }

      if (accountSettings.mode === "paused") {
        await releaseRecoveryMessageForAccountPause(message.id, claimToken);
        continue;
      }

      const sequence = await getRecoverySequenceStatus(message.sequence_id);

      if (!sequence || sequence.status !== "active") {
        await cancelRecoveryMessage(
          message.id,
          claimToken,
          sequence
            ? `Recovery sequence is not active (${sequence.status}).`
            : "Recovery sequence no longer exists.",
        );
        result.canceled += 1;
        continue;
      }

      const stopCheck = await checkLiveStripeStopConditions(failedPayment);

      if (!stopCheck.canSend) {
        if (stopCheck.disposition === "pause") {
          await pauseRecoveryMessage(message.id, claimToken, stopCheck.reason);
        } else {
          await cancelRecoveryMessage(message.id, claimToken, stopCheck.reason);
          result.canceled += 1;
        }
        continue;
      }

      const customerRecipient =
        getInvoiceCustomerEmail(stopCheck.latestInvoice) ??
        getInvoiceCustomerEmail(failedPayment.latest_payload);
      const recipientEmail = getRecoveryDeliveryRecipient({
        approvedTestRecipient: accountSettings.approvedTestRecipient,
        customerRecipient,
        mode: accountSettings.mode,
      });

      if (!recipientEmail) {
        await completeRecoveryMessageDelivery({
          claimToken,
          errorCode:
            accountSettings.mode === "test"
              ? "approved_test_recipient_missing"
              : "customer_email_missing",
          errorDetails: {
            reason:
              accountSettings.mode === "test"
                ? "Test mode requires an approved test recipient."
                : "No customer email found on invoice payload.",
          },
          messageId: message.id,
          outcome: "failed_terminal",
        });
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
        message.metadata?.copyVersion === RECOVERY_MESSAGE_COPY_VERSION
          ? message.body_preview ?? undefined
          : undefined,
      );

      const from =
        getRecoveryEmailFrom() ??
        `${emailSettings.senderName} <${emailSettings.supportEmail}>`;

      const providerMessageId = await sendWithResend({
        from,
        html: copy.html,
        idempotencyKey: message.provider_idempotency_key,
        replyTo: emailSettings.replyToEmail,
        subject: message.subject ?? `Payment reminder for invoice ${failedPayment.stripe_invoice_id}`,
        text: copy.text,
        to: recipientEmail,
      });

      await completeRecoveryMessageDelivery({
        claimToken,
        messageId: message.id,
        outcome: "sent",
        providerMessageId,
        sentToEmail: recipientEmail,
      });
      result.sent += 1;
    } catch (error) {
      const deliveryError =
        error instanceof RecoveryDeliveryError
          ? error
          : new RecoveryDeliveryError({
              code: "delivery_unexpected_error",
              disposition: "retryable",
              message: "An unexpected recovery email error occurred.",
            });
      const retry = shouldRetryRecoveryDelivery(
        deliveryError.disposition,
        message.send_attempt_count,
      );

      await completeRecoveryMessageDelivery({
        claimToken,
        errorCode: deliveryError.code,
        errorDetails: { message: deliveryError.message },
        messageId: message.id,
        nextAttemptAt: retry
          ? getRecoveryDeliveryNextAttemptAt(message.send_attempt_count)
          : null,
        outcome: retry ? "failed_retryable" : "failed_terminal",
      });
      result.failed += 1;
    }
  }

  return result;
}
