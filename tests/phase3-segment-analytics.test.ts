import { describe, expect, it } from "vitest";
import { buildInsightsMetrics } from "../app/lib/server/insights-metrics";

describe("Phase 3 segment analytics", () => {
  it("reports recovery outcomes separately by invoice audience", () => {
    const metrics = buildInsightsMetrics({
      failedPayments: [
        { amount_due: 2500, audience_segment: "subscription", created_at: "2026-01-01", currency: "eur", id: "1", last_event_type: "invoice.payment_failed", recovered_at: "2026-01-02", status: "recovered" },
        { audience_segment: "subscription", created_at: "2026-01-01", id: "2", last_event_type: "invoice.payment_failed", recovered_at: null, status: "failed" },
        { audience_segment: "standalone", created_at: "2026-01-01", id: "3", last_event_type: "invoice.payment_failed", recovered_at: null, status: "failed" },
      ],
      messages: [],
      sequences: [],
    });
    expect(metrics.segmentBreakdown[0]).toMatchObject({
      label: "Recurring subscriptions", recoveredCount: 1, recoveryRate: 50, totalCount: 2,
      recoveredRevenue: "€25.00",
    });
    expect(metrics.segmentBreakdown[1]).toMatchObject({ totalCount: 1, recoveryRate: 0 });
  });
});
