import "server-only";

import type Stripe from "stripe";
import { aggregateCurrencyAmounts } from "../currency";
import { createStripePlatformClient } from "../stripe/server";
import { collectStripePages } from "../stripe/pagination";
import { reconcileScheduledCancellationSubscriptions } from "./cancellation-cases";
import type { StripeSyncSummary } from "./stripe-connections";

export async function performInitialStripeSync(
  stripeAccountId: string,
  cancellationContext?: {
    livemode: boolean;
    userId: string;
  },
): Promise<StripeSyncSummary> {
  const stripe = createStripePlatformClient();

  if (!stripe) {
    throw new Error("Stripe is not configured.");
  }

  const [customers, subscriptions, invoices] = await Promise.all([
    collectStripePages((startingAfter) =>
      stripe.customers.list(
        { limit: 100, starting_after: startingAfter },
        { stripeAccount: stripeAccountId },
      ),
    ),
    collectStripePages((startingAfter) =>
      stripe.subscriptions.list(
        { limit: 100, starting_after: startingAfter, status: "all" },
        { stripeAccount: stripeAccountId },
      ),
    ),
    collectStripePages((startingAfter) =>
      stripe.invoices.list(
        { limit: 100, starting_after: startingAfter },
        { stripeAccount: stripeAccountId },
      ),
    ),
  ]);

  if (cancellationContext) {
    try {
      await reconcileScheduledCancellationSubscriptions({
        livemode: cancellationContext.livemode,
        stripeAccountId,
        source: "initial_sync",
        subscriptions,
        userId: cancellationContext.userId,
      });
    } catch (error) {
      console.error("Cancellation shadow reconciliation failed during Stripe sync", {
        errorType: error instanceof Error ? error.name : "UnknownError",
        stripeAccountId,
      });
    }
  }

  return buildStripeSyncSummary(customers, subscriptions, invoices);
}

export function buildStripeSyncSummary(
  customers: Stripe.Customer[],
  subscriptions: Stripe.Subscription[],
  invoices: Stripe.Invoice[],
): StripeSyncSummary {
  const failedInvoices = invoices.filter(
    (invoice) => invoice.status !== "paid" && invoice.attempt_count > 0 && invoice.amount_due > 0,
  );

  const atRiskCustomers = new Set(
    failedInvoices
      .map((invoice) =>
        typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null,
      )
      .filter(Boolean),
  );

  const revenueAtRiskByCurrency = aggregateCurrencyAmounts(
    failedInvoices.map((invoice) => ({
      amount: invoice.amount_due,
      currency: invoice.currency,
    })),
  );

  return {
    activeSubscriptionsCount: subscriptions.filter(
      (subscription) => subscription.status === "active" || subscription.status === "past_due",
    ).length,
    atRiskCustomersCount: atRiskCustomers.size,
    customersCount: customers.length,
    failedPaymentsCount: failedInvoices.length,
    recentFailedInvoices: failedInvoices.slice(0, 20).map((invoice) => ({
      amountDue: invoice.amount_due,
      attemptCount: invoice.attempt_count,
      currency: invoice.currency,
      customerId:
        typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null,
      invoiceId: invoice.id,
      status: invoice.status,
    })),
    revenueAtRiskByCurrency,
  };
}
