import "server-only";

import type Stripe from "stripe";
import {
  getSyntheticTestCaseGateError,
  type ControlledTestEligibility,
} from "../recovery/controlled-test-plan";
import type { RecoveryModeSettings } from "./recovery-account-settings";
import { recordStripeInvoiceEvent } from "./stripe-webhooks";

export class SyntheticTestCaseError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "SyntheticTestCaseError";
  }
}

export async function createSyntheticSandboxCase({
  confirmation,
  eligibility,
  recoverySettings,
  userId,
}: {
  confirmation: unknown;
  eligibility: ControlledTestEligibility;
  recoverySettings: RecoveryModeSettings;
  userId: string;
}) {
  const gateError = getSyntheticTestCaseGateError({ confirmation, eligibility });
  if (gateError) throw new SyntheticTestCaseError(gateError, 409);

  if (
    !recoverySettings.connected ||
    recoverySettings.livemode !== false ||
    recoverySettings.mode !== "test" ||
    !recoverySettings.stripeAccountId
  ) {
    throw new SyntheticTestCaseError(
      "The connected account is not inside the sandbox Test-mode safety boundary.",
      409,
    );
  }

  const marker = `rr_guided_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const occurredAt = new Date().toISOString();
  const invoice = {
    amount_due: 7900,
    amount_paid: 0,
    attempt_count: 1,
    billing_reason: "subscription_cycle",
    currency: "eur",
    customer: `cus_${marker}`,
    customer_email: recoverySettings.approvedTestRecipient,
    id: `in_${marker}`,
    livemode: false,
    metadata: { revrecovery_synthetic_test: "true" },
    next_payment_attempt: null,
    object: "invoice",
    status: "open",
    subscription: `sub_${marker}`,
  } as unknown as Stripe.Invoice;

  const failedPayment = await recordStripeInvoiceEvent({
    amountDue: 7900,
    amountPaid: 0,
    attemptCount: 1,
    billingReason: "subscription_cycle",
    currency: "eur",
    declineCode: "insufficient_funds",
    eventCreatedAt: occurredAt,
    eventType: "invoice.payment_failed",
    failureCode: "card_declined",
    failureMessage: "Synthetic guided test case. No Stripe payment was attempted.",
    invoiceKind: "subscription",
    invoiceStatus: "open",
    livemode: false,
    nextPaymentAttemptAt: null,
    payload: invoice,
    stripeAccountId: recoverySettings.stripeAccountId,
    stripeChargeId: null,
    stripeCustomerId: `cus_${marker}`,
    stripeEventId: `rr_test_evt_${marker}`,
    stripeInvoiceId: `in_${marker}`,
    stripePaymentIntentId: null,
    stripeSubscriptionId: `sub_${marker}`,
    targetStatus: "detected",
    terminalReason: null,
    userId,
  });

  if (!failedPayment) {
    throw new SyntheticTestCaseError("The synthetic case could not be created.", 500);
  }

  return {
    caseId: failedPayment.id,
    caseUrl: `/dashboard/cases/${failedPayment.id}`,
    invoiceId: failedPayment.stripe_invoice_id,
  };
}
