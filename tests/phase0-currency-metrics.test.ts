import type Stripe from "stripe";
import { describe, expect, it } from "vitest";
import {
  aggregateCurrencyAmounts,
  formatCurrencyAmounts,
} from "../app/lib/currency";
import { buildDashboardMetrics } from "../app/lib/server/dashboard-metrics";
import { buildOptimizeRecommendations } from "../app/lib/server/optimize-recommendations";
import { normalizeStripeSyncSummary } from "../app/lib/server/stripe-connections";
import { buildStripeSyncSummary } from "../app/lib/server/stripe-sync";

describe("Phase 0 currency-safe metrics", () => {
  it("groups currencies without combining them and uses stable ordering", () => {
    const totals = aggregateCurrencyAmounts([
      { amount: 500, currency: "USD" },
      { amount: 700, currency: " eur " },
      { amount: 250, currency: "usd" },
    ]);

    expect(totals).toEqual([
      { amount: 700, currency: "eur" },
      { amount: 750, currency: "usd" },
    ]);
    expect(formatCurrencyAmounts(totals)).toBe("€7.00 + $7.50");
  });

  it("does not silently label an unknown currency as USD", () => {
    const totals = aggregateCurrencyAmounts([{ amount: 125, currency: null }]);

    expect(totals).toEqual([{ amount: 125, currency: null }]);
    expect(formatCurrencyAmounts(totals)).toBe("1.25 (currency unknown)");
  });

  it("shows an explicit zero when no monetary rows exist", () => {
    expect(formatCurrencyAmounts([])).toBe("$0.00");
  });

  it("keeps terminal cases out of dashboard revenue at risk", () => {
    const metrics = buildDashboardMetrics(
      [
        { amount_due: 1000, currency: "eur", status: "active", stripe_customer_id: "cus_1" },
        { amount_due: 2000, currency: "usd", status: "awaiting_retry", stripe_customer_id: "cus_2" },
        { amount_due: 3000, currency: "eur", status: "recovered", stripe_customer_id: "cus_3" },
        { amount_due: 4000, currency: "eur", status: "no_longer_applicable", stripe_customer_id: "cus_4" },
        { amount_due: 5000, currency: "usd", status: "canceled_by_merchant", stripe_customer_id: "cus_5" },
      ],
      [{ status: "sent" }],
    );

    expect(metrics.revenueAtRiskByCurrency).toEqual([
      { amount: 1000, currency: "eur" },
      { amount: 2000, currency: "usd" },
    ]);
    expect(metrics.recoveredRevenueByCurrency).toEqual([
      { amount: 3000, currency: "eur" },
    ]);
    expect(metrics.metricCards[0]?.value).toBe("€10.00 + $20.00");
    expect(metrics.atRiskCustomersCount).toBe(2);
    expect(metrics.recoveryRate).toBe(33);
  });

  it("uses the same state and currency rules for Optimize", () => {
    const result = buildOptimizeRecommendations(
      [
        { amount_due: 1200, currency: "gbp", recovery_stage: "email_1", status: "active", stripe_customer_id: "cus_1" },
        { amount_due: 800, currency: "eur", recovery_stage: "email_2", status: "exhausted", stripe_customer_id: "cus_2" },
        { amount_due: 900, currency: "usd", recovery_stage: "closed", status: "canceled_by_merchant", stripe_customer_id: "cus_3" },
      ],
      [],
    );

    expect(result.impactSummary).toEqual({
      caption: "Across 2 open failed payments",
      value: "€8.00 + £12.00",
    });
  });

  it("stores initial Stripe sync revenue grouped by currency", () => {
    const summary = buildStripeSyncSummary(
      [{ id: "cus_1" }, { id: "cus_2" }] as Stripe.Customer[],
      [{ status: "active" }] as Stripe.Subscription[],
      [
        { amount_due: 1000, attempt_count: 1, currency: "eur", customer: "cus_1", id: "in_1", status: "open" },
        { amount_due: 2500, attempt_count: 2, currency: "usd", customer: "cus_2", id: "in_2", status: "open" },
        { amount_due: 500, attempt_count: 0, currency: "eur", customer: "cus_1", id: "in_3", status: "open" },
      ] as Stripe.Invoice[],
    );

    expect(summary.revenueAtRiskByCurrency).toEqual([
      { amount: 1000, currency: "eur" },
      { amount: 2500, currency: "usd" },
    ]);
    expect(summary.failedPaymentsCount).toBe(2);
    expect(summary.atRiskCustomersCount).toBe(2);
  });

  it("normalizes a legacy single-currency sync summary", () => {
    const normalized = normalizeStripeSyncSummary({
      activeSubscriptionsCount: 1,
      atRiskCustomersCount: 1,
      customersCount: 2,
      failedPaymentsCount: 1,
      recentFailedInvoices: [],
      revenueAtRiskAmount: 725,
      revenueAtRiskCurrency: "EUR",
    } as never);

    expect(normalized?.revenueAtRiskByCurrency).toEqual([
      { amount: 725, currency: "eur" },
    ]);
  });
});
