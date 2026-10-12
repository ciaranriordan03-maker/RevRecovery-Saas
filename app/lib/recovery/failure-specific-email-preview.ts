import type { RecoveryFailureCategory } from "./decline-diagnostics";

export type FailureSpecificEmailPreview = {
  actionLine: string;
  contextLine: string;
  rationale: string;
  retryLine: string;
  subject: string;
};

type PreviewCopy = Omit<FailureSpecificEmailPreview, "retryLine"> & {
  retryWithDate: string;
  retryWithoutDate: string;
};

const PREVIEW_COPY: Record<RecoveryFailureCategory, PreviewCopy> = {
  authentication_required: {
    actionLine: "Please open the secure Stripe invoice and complete the bank authentication step.",
    contextLine: "Your bank needs you to confirm this payment before it can be completed.",
    rationale: "Makes the required authentication explicit instead of implying that waiting for another retry is enough.",
    retryWithDate: "Stripe currently shows another attempt on {date}, but the bank confirmation is still required.",
    retryWithoutDate: "A further retry may not succeed until the bank confirmation is completed.",
    subject: "Action needed: confirm your payment",
  },
  card_details: {
    actionLine: "Please open the secure Stripe invoice to check your saved card details or use another payment method.",
    contextLine: "Some of the saved payment details appear to be incorrect or incomplete.",
    rationale: "Directs the customer to correct the details before another attempt.",
    retryWithDate: "Stripe currently shows another attempt on {date}. Updating the details first gives it the best chance of succeeding.",
    retryWithoutDate: "The payment can be tried again after the details are corrected.",
    subject: "Please check your payment details",
  },
  expired_card: {
    actionLine: "Please open the secure Stripe invoice and replace the expired card with a current payment method.",
    contextLine: "The card saved for this payment has expired.",
    rationale: "Explains the specific fix without adding unnecessary urgency or ambiguity.",
    retryWithDate: "Stripe currently shows another attempt on {date}. Please update the card before then.",
    retryWithoutDate: "The payment can be tried again after a current payment method is added.",
    subject: "Your saved card has expired",
  },
  fraud_or_security: {
    actionLine: "Please use another payment method, or contact your card issuer if you recognise this payment.",
    contextLine: "Your card issuer declined the payment for a security-related reason.",
    rationale: "Avoids claiming fraud while giving the customer a safe next action.",
    retryWithDate: "Stripe currently shows another attempt on {date}, but the same payment method may continue to be declined.",
    retryWithoutDate: "The same payment method may continue to be declined until the issuer concern is resolved.",
    subject: "Your card issuer declined this payment",
  },
  generic_decline: {
    actionLine: "Please open the secure Stripe invoice to use another payment method, or contact your card issuer for more information.",
    contextLine: "Your card issuer declined the payment without providing a specific reason.",
    rationale: "States only what Stripe knows and avoids guessing at the cause.",
    retryWithDate: "Stripe currently shows another attempt on {date}. You can update the payment method before then.",
    retryWithoutDate: "Using another payment method may help if the issuer continues to decline the card.",
    subject: "Your payment was declined",
  },
  insufficient_funds: {
    actionLine: "Please make funds available or open the secure Stripe invoice to use another payment method.",
    contextLine: "Your card issuer reported that there were not enough available funds or credit for this payment.",
    rationale: "Explains the specific issue and offers both practical recovery paths without promising success.",
    retryWithDate: "Stripe currently shows another attempt on {date}, but a successful payment is not guaranteed.",
    retryWithoutDate: "A later attempt may succeed, but a successful payment is not guaranteed.",
    subject: "Payment could not be completed",
  },
  not_permitted: {
    actionLine: "Please contact your card issuer or open the secure Stripe invoice to use a different payment method.",
    contextLine: "Your card issuer reported that this card or transaction is not permitted.",
    rationale: "Avoids encouraging repeated retries while the issuer restriction remains unresolved.",
    retryWithDate: "Stripe currently shows another attempt on {date}, but the restriction may need to be resolved first.",
    retryWithoutDate: "Another attempt may fail until the issuer restriction is resolved or the payment method changes.",
    subject: "Your payment method needs attention",
  },
  processing_error: {
    actionLine: "No immediate action may be needed. You can use another payment method if the problem continues.",
    contextLine: "Stripe or the payment network encountered a processing problem while attempting the payment.",
    rationale: "Treats a potentially temporary network problem differently from a card problem.",
    retryWithDate: "Stripe currently shows another attempt on {date}, which may succeed if the issue was temporary.",
    retryWithoutDate: "A later attempt may succeed if the processing issue was temporary.",
    subject: "We could not process your payment",
  },
  unknown: {
    actionLine: "Please open the secure Stripe invoice to review the payment or use another payment method if needed.",
    contextLine: "Stripe did not provide a specific reason for the unsuccessful payment.",
    rationale: "Keeps the message useful without inventing a reason Stripe did not provide.",
    retryWithDate: "Stripe currently shows another attempt on {date}.",
    retryWithoutDate: "Please use the Stripe invoice as the source of truth for the payment status.",
    subject: "Please review your outstanding payment",
  },
};

export function buildFailureSpecificEmailPreview({
  category,
  nextRetryLabel,
}: {
  category: RecoveryFailureCategory;
  nextRetryLabel: string | null;
}): FailureSpecificEmailPreview {
  const copy = PREVIEW_COPY[category];

  return {
    actionLine: copy.actionLine,
    contextLine: copy.contextLine,
    rationale: copy.rationale,
    retryLine: nextRetryLabel
      ? copy.retryWithDate.replace("{date}", nextRetryLabel)
      : copy.retryWithoutDate,
    subject: copy.subject,
  };
}
