export const RECOVERY_FAILURE_CATEGORIES = [
  "authentication_required",
  "card_details",
  "expired_card",
  "fraud_or_security",
  "generic_decline",
  "insufficient_funds",
  "not_permitted",
  "processing_error",
  "unknown",
] as const;

export type RecoveryFailureCategory =
  (typeof RECOVERY_FAILURE_CATEGORIES)[number];

export type RecoveryDeclineDiagnostic = {
  category: RecoveryFailureCategory;
  confidence: "high" | "medium" | "unknown";
  customerAction: string;
  explanation: string;
  merchantAction: string;
  rawDeclineCode: string | null;
  rawFailureCode: string | null;
  rawMessage: string | null;
  retryGuidance: string;
  source: "decline_code" | "failure_code" | "unavailable";
  title: string;
};

type DiagnosticCopy = Pick<
  RecoveryDeclineDiagnostic,
  | "category"
  | "customerAction"
  | "explanation"
  | "merchantAction"
  | "retryGuidance"
  | "title"
>;

const DIAGNOSTICS: Record<RecoveryFailureCategory, DiagnosticCopy> = {
  authentication_required: {
    category: "authentication_required",
    customerAction: "Complete the bank authentication requested by Stripe.",
    explanation:
      "The bank requires the customer to confirm this payment before it can succeed.",
    merchantAction:
      "Direct the customer to Stripe's secure invoice page to complete authentication.",
    retryGuidance:
      "Do not describe another automatic retry as sufficient until authentication is completed.",
    title: "Bank authentication required",
  },
  card_details: {
    category: "card_details",
    customerAction: "Check the saved card details or use another payment method.",
    explanation:
      "Stripe reported that some of the saved payment details are incorrect or incomplete.",
    merchantAction:
      "Ask the customer to update their payment details through Stripe's secure invoice page.",
    retryGuidance: "Retry after the customer has corrected their payment details.",
    title: "Payment details need updating",
  },
  expired_card: {
    category: "expired_card",
    customerAction: "Replace the expired card with a current payment method.",
    explanation: "Stripe reported that the saved card has expired.",
    merchantAction:
      "Ask the customer to update their card through Stripe's secure invoice page.",
    retryGuidance: "Retry after the customer adds a valid payment method.",
    title: "Card expired",
  },
  fraud_or_security: {
    category: "fraud_or_security",
    customerAction:
      "Use another payment method or contact the card issuer if the payment is legitimate.",
    explanation:
      "The issuer or payment network declined the payment for a security-related reason. Stripe may not receive more specific details.",
    merchantAction:
      "Avoid stating that fraud occurred. Ask the customer to use another payment method or contact their issuer.",
    retryGuidance:
      "Do not repeatedly retry the same payment method without updated issuer guidance.",
    title: "Security-related decline",
  },
  generic_decline: {
    category: "generic_decline",
    customerAction:
      "Contact the card issuer or use another payment method.",
    explanation:
      "The card issuer declined the payment without giving Stripe a specific reason.",
    merchantAction:
      "Tell the customer that their issuer declined the payment, without guessing why.",
    retryGuidance:
      "Follow Stripe's configured retry schedule; use another payment method if declines continue.",
    title: "Issuer declined the payment",
  },
  insufficient_funds: {
    category: "insufficient_funds",
    customerAction:
      "Make funds available or use another payment method.",
    explanation:
      "The issuer told Stripe that the payment method did not have enough available funds or credit.",
    merchantAction:
      "Give the customer a secure way to use another payment method and keep Stripe's retry timing visible.",
    retryGuidance:
      "A later retry may succeed, but RevRecovery should not promise that it will.",
    title: "Insufficient funds",
  },
  not_permitted: {
    category: "not_permitted",
    customerAction:
      "Contact the card issuer or use a payment method that permits this transaction.",
    explanation:
      "The issuer reported that this card or transaction is not permitted.",
    merchantAction:
      "Ask the customer to contact their issuer or use another payment method.",
    retryGuidance:
      "Avoid repeated retries until the issuer restriction is resolved or the payment method changes.",
    title: "Transaction not permitted",
  },
  processing_error: {
    category: "processing_error",
    customerAction:
      "Try again later or use another payment method if the problem continues.",
    explanation:
      "Stripe or the payment network encountered a processing problem while attempting the payment.",
    merchantAction:
      "Monitor Stripe's next retry and ask for a different payment method if the error persists.",
    retryGuidance: "A later retry may succeed because this can be temporary.",
    title: "Payment processing problem",
  },
  unknown: {
    category: "unknown",
    customerAction:
      "Review the Stripe invoice and use another payment method if needed.",
    explanation:
      "Stripe did not provide a specific failure reason for this payment.",
    merchantAction:
      "Review the invoice in Stripe and avoid guessing why the payment failed.",
    retryGuidance:
      "Use Stripe's invoice status and configured retry schedule as the source of truth.",
    title: "Failure reason not provided",
  },
};

const DECLINE_CATEGORY_BY_CODE: Record<string, RecoveryFailureCategory> = {
  authentication_not_handled: "authentication_required",
  authentication_required: "authentication_required",
  card_not_supported: "not_permitted",
  card_velocity_exceeded: "not_permitted",
  do_not_honor: "generic_decline",
  do_not_try_again: "not_permitted",
  duplicate_transaction: "processing_error",
  expired_card: "expired_card",
  fraudulent: "fraud_or_security",
  generic_decline: "generic_decline",
  incorrect_number: "card_details",
  insufficient_funds: "insufficient_funds",
  invalid_account: "card_details",
  invalid_amount: "not_permitted",
  invalid_cvc: "card_details",
  invalid_expiry_month: "card_details",
  invalid_expiry_year: "card_details",
  lost_card: "fraud_or_security",
  merchant_blacklist: "fraud_or_security",
  new_account_information_available: "card_details",
  no_action_taken: "generic_decline",
  not_permitted: "not_permitted",
  pickup_card: "fraud_or_security",
  processing_error: "processing_error",
  reenter_transaction: "processing_error",
  restricted_card: "not_permitted",
  revocation_of_all_authorizations: "not_permitted",
  revocation_of_authorization: "not_permitted",
  security_violation: "fraud_or_security",
  service_not_allowed: "not_permitted",
  stolen_card: "fraud_or_security",
  stop_payment_order: "not_permitted",
  transaction_not_allowed: "not_permitted",
  try_again_later: "processing_error",
  withdrawal_count_limit_exceeded: "not_permitted",
};

const FAILURE_CATEGORY_BY_CODE: Record<string, RecoveryFailureCategory> = {
  authentication_required: "authentication_required",
  card_declined: "generic_decline",
  expired_card: "expired_card",
  incorrect_cvc: "card_details",
  incorrect_number: "card_details",
  invalid_cvc: "card_details",
  invalid_expiry_month: "card_details",
  invalid_expiry_year: "card_details",
  processing_error: "processing_error",
};

function normalizeCode(value: string | null | undefined) {
  return value?.trim().toLowerCase() || null;
}

function normalizeMessage(value: string | null | undefined) {
  return value?.trim() || null;
}

export function getRecoveryDeclineDiagnostic({
  declineCode,
  failureCode,
  failureMessage,
}: {
  declineCode?: string | null;
  failureCode?: string | null;
  failureMessage?: string | null;
}): RecoveryDeclineDiagnostic {
  const rawDeclineCode = normalizeCode(declineCode);
  const rawFailureCode = normalizeCode(failureCode);
  const rawMessage = normalizeMessage(failureMessage);
  const declineCategory = rawDeclineCode
    ? DECLINE_CATEGORY_BY_CODE[rawDeclineCode]
    : undefined;
  const failureCategory = rawFailureCode
    ? FAILURE_CATEGORY_BY_CODE[rawFailureCode]
    : undefined;
  const category = declineCategory ?? failureCategory ?? "unknown";
  const source = declineCategory
    ? "decline_code"
    : failureCategory
      ? "failure_code"
      : "unavailable";

  return {
    ...DIAGNOSTICS[category],
    confidence: source === "decline_code" ? "high" : source === "failure_code" ? "medium" : "unknown",
    rawDeclineCode,
    rawFailureCode,
    rawMessage,
    source,
  };
}
