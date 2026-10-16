import { describe, expect, it } from "vitest";
import { buildRecoveryOpportunityReport } from "../app/lib/recovery/opportunity-report";
import type { StripeConnectionSummary } from "../app/lib/server/stripe-connections";

function connection(
  overrides: Partial<StripeConnectionSummary> = {},
): StripeConnectionSummary {
  return {
    accountDisplayName: null,
    accountEmail: null,
    connected: true,
    connectedAt: "2026-09-01T12:00:00.000Z",
    lastSyncedAt: "2026-09-01T12:01:00.000Z",
    status: "connected",
    stripeAccountId: "acct_test",
    syncSummary: {
      activeSubscriptionsCount: 18,
      atRiskCustomersCount: 2,
      customersCount: 25,
      failedPaymentsCount: 3,
      recentFailedInvoices: [],
      revenueAtRiskByCurrency: [
        { amount: 7900, currency: "eur" },
        { amount: 12000, currency: "usd" },
      ],
    },
    ...overrides,
  };
}

describe("recovery opportunity report", () => {
  it("builds a currency-safe connection-time snapshot", () => {
    const report = buildRecoveryOpportunityReport(connection());

    expect(report).toMatchObject({
      atRiskCustomersCount: 2,
      failedPaymentsCount: 3,
      revenueAtRisk: "€79.00 + $120.00",
      state: "available",
    });
    expect(report.scopeNote).toContain("up to the 100 most recent Stripe invoices");
  });

  it("does not claim an opportunity when Stripe is disconnected", () => {
    const report = buildRecoveryOpportunityReport(connection({
      connected: false,
      lastSyncedAt: null,
      status: "not_connected",
      stripeAccountId: null,
      syncSummary: null,
    }));

    expect(report.state).toBe("not_connected");
    expect(report.failedPaymentsCount).toBe(0);
  });

  it("distinguishes a connected account with no saved scan", () => {
    const report = buildRecoveryOpportunityReport(connection({ syncSummary: null }));

    expect(report.state).toBe("not_scanned");
    expect(report.connected).toBe(true);
  });
});
