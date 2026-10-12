import { formatCurrencyAmounts } from "../currency";
import type { StripeConnectionSummary } from "../server/stripe-connections";

export type RecoveryOpportunityReport = {
  atRiskCustomersCount: number;
  connected: boolean;
  failedPaymentsCount: number;
  lastSyncedAt: string | null;
  revenueAtRisk: string;
  scopeNote: string;
  state: "available" | "not_connected" | "not_scanned";
};

export function buildRecoveryOpportunityReport(
  connection: StripeConnectionSummary,
): RecoveryOpportunityReport {
  if (!connection.connected) {
    return {
      atRiskCustomersCount: 0,
      connected: false,
      failedPaymentsCount: 0,
      lastSyncedAt: null,
      revenueAtRisk: formatCurrencyAmounts([]),
      scopeNote: "Connect Stripe to create an initial failed-payment opportunity snapshot.",
      state: "not_connected",
    };
  }

  if (!connection.syncSummary) {
    return {
      atRiskCustomersCount: 0,
      connected: true,
      failedPaymentsCount: 0,
      lastSyncedAt: connection.lastSyncedAt,
      revenueAtRisk: formatCurrencyAmounts([]),
      scopeNote: "Stripe is connected, but no initial opportunity snapshot is available yet.",
      state: "not_scanned",
    };
  }

  return {
    atRiskCustomersCount: connection.syncSummary.atRiskCustomersCount,
    connected: true,
    failedPaymentsCount: connection.syncSummary.failedPaymentsCount,
    lastSyncedAt: connection.lastSyncedAt,
    revenueAtRisk: formatCurrencyAmounts(
      connection.syncSummary.revenueAtRiskByCurrency,
    ),
    scopeNote:
      "This connection-time snapshot covers up to the 100 most recent Stripe invoices. It is an opportunity estimate, not a complete historical audit.",
    state: "available",
  };
}
