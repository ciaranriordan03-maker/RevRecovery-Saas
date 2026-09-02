import type Stripe from "stripe";

export const RECOVERY_CASE_STATUSES = [
  "detected",
  "active",
  "awaiting_retry",
  "payment_method_updated",
  "recovered",
  "exhausted",
  "canceled_by_merchant",
  "no_longer_applicable",
  "failed_operationally",
] as const;

export type RecoveryCaseStatus = (typeof RECOVERY_CASE_STATUSES)[number];

export const CLOSED_RECOVERY_CASE_STATUSES = [
  "recovered",
  "canceled_by_merchant",
  "no_longer_applicable",
] as const satisfies readonly RecoveryCaseStatus[];

export function getEffectiveRecoveryCaseStatus(
  caseStatus: string | null | undefined,
  legacyStatus: string | null | undefined,
) {
  return caseStatus?.trim() || legacyStatus?.trim() || "detected";
}

export function isOpenRecoveryCase(
  caseStatus: string | null | undefined,
  legacyStatus: string | null | undefined,
) {
  const status = getEffectiveRecoveryCaseStatus(caseStatus, legacyStatus);

  return !CLOSED_RECOVERY_CASE_STATUSES.some(
    (closedStatus) => closedStatus === status,
  );
}

export type InvoiceEventDecision = {
  createsCase: boolean;
  targetStatus: RecoveryCaseStatus | null;
  terminalReason: string | null;
};

export function decideInvoiceEvent(
  eventType:
    | "invoice.paid"
    | "invoice.payment_failed"
    | "invoice.payment_succeeded"
    | "invoice.updated",
  invoiceStatus: Stripe.Invoice.Status | null,
  caseExists: boolean,
): InvoiceEventDecision {
  if (eventType === "invoice.payment_failed") {
    return { createsCase: true, targetStatus: "active", terminalReason: null };
  }

  if (!caseExists) {
    return { createsCase: false, targetStatus: null, terminalReason: null };
  }

  if (eventType === "invoice.paid" || eventType === "invoice.payment_succeeded") {
    return { createsCase: false, targetStatus: "recovered", terminalReason: null };
  }

  if (invoiceStatus === "void" || invoiceStatus === "uncollectible") {
    return {
      createsCase: false,
      targetStatus: "no_longer_applicable",
      terminalReason: `invoice_${invoiceStatus}`,
    };
  }

  if (invoiceStatus === "paid") {
    return { createsCase: false, targetStatus: "recovered", terminalReason: null };
  }

  return { createsCase: false, targetStatus: null, terminalReason: null };
}

export function getInvoiceKind(invoice: Stripe.Invoice) {
  return getInvoiceSubscriptionId(invoice) ? "subscription" : "standalone";
}

export function getInvoiceSubscriptionId(invoice: Stripe.Invoice) {
  const subscription = (
    invoice as Stripe.Invoice & {
      subscription?: string | Stripe.Subscription | null;
    }
  ).subscription;

  if (!subscription) {
    return null;
  }

  return typeof subscription === "string" ? subscription : subscription.id;
}

export function getInvoicePaymentContext(invoice: Stripe.Invoice) {
  const compatibleInvoice = invoice as Stripe.Invoice & {
    charge?: string | Stripe.Charge | null;
    payment_intent?: string | Stripe.PaymentIntent | null;
  };
  const paymentIntent = compatibleInvoice.payment_intent;
  const charge = compatibleInvoice.charge;
  const expandedIntent =
    paymentIntent && typeof paymentIntent === "object" ? paymentIntent : null;
  const lastPaymentError = expandedIntent?.last_payment_error;

  return {
    declineCode: lastPaymentError?.decline_code ?? null,
    failureCode: lastPaymentError?.code ?? null,
    failureMessage: lastPaymentError?.message ?? null,
    stripeChargeId:
      typeof charge === "string"
        ? charge
        : charge?.id ??
          (typeof expandedIntent?.latest_charge === "string"
            ? expandedIntent.latest_charge
            : expandedIntent?.latest_charge?.id ?? null),
    stripePaymentIntentId:
      typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id ?? null,
  };
}
