import "server-only";

import { createStripePlatformClient } from "../stripe/server";
import type { StripeSyncSummary } from "./stripe-connections";

export async function performInitialStripeSync(
  stripeAccountId: string,
): Promise<StripeSyncSummary> {
  const stripe = createStripePlatformClient();

  if (!stripe) {
    throw new Error("Stripe is not configured.");
  }

  const [customers, subscriptions, invoices] = await Promise.all([
    stripe.customers.list({ limit: 100 }, { stripeAccount: stripeAccountId }),
    stripe.subscriptions.list(
      { limit: 100, status: "all" },
      { stripeAccount: stripeAccountId },
    ),
    stripe.invoices.list({ limit: 100 }, { stripeAccount: stripeAccountId }),
  ]);

  const failedInvoices = invoices.data.filter(
    (invoice) => invoice.status !== "paid" && invoice.attempt_count > 0 && invoice.amount_due > 0,
  );

  const atRiskCustomers = new Set(
    failedInvoices
      .map((invoice) =>
        typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null,
      )
      .filter(Boolean),
  );

  const revenueAtRiskAmount = failedInvoices.reduce(
    (total, invoice) => total + invoice.amount_due,
    0,
  );

  return {
    activeSubscriptionsCount: subscriptions.data.filter(
      (subscription) => subscription.status === "active" || subscription.status === "past_due",
    ).length,
    atRiskCustomersCount: atRiskCustomers.size,
    customersCount: customers.data.length,
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
    revenueAtRiskAmount,
    revenueAtRiskCurrency: failedInvoices[0]?.currency ?? null,
  };
}
