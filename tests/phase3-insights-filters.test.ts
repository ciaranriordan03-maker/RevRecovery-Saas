import { describe, expect, it } from "vitest";
import { filterInsightsRows, normalizeInsightsFilter } from "../app/lib/server/insights-metrics";

describe("Phase 3 insight filters", () => {
  it("normalizes unsupported query values", () => {
    expect(normalizeInsightsFilter({ period: "bad", segment: "bad" })).toEqual({ period: "30d", segment: "all" });
  });

  it("filters every related dataset from the selected case cohort", () => {
    const result = filterInsightsRows({
      events: [{ event_type: "opened", recovery_message_id: "m1" }, { event_type: "opened", recovery_message_id: "m2" }],
      failedPayments: [
        { audience_segment: "subscription", created_at: "2026-09-01", id: "p1", last_event_type: "invoice.payment_failed", recovered_at: null, status: "failed" },
        { audience_segment: "standalone", created_at: "2026-09-01", id: "p2", last_event_type: "invoice.payment_failed", recovered_at: null, status: "failed" },
      ],
      filter: { period: "30d", segment: "subscription" },
      messages: [
        { id: "m1", failed_payment_id: "p1", message_key: "email_1", provider_delivery_occurred_at: null, provider_delivery_status: null, sequence_id: "s1", sent_at: null, step_number: 1, status: "pending" },
        { id: "m2", failed_payment_id: "p2", message_key: "email_1", provider_delivery_occurred_at: null, provider_delivery_status: null, sequence_id: "s2", sent_at: null, step_number: 1, status: "pending" },
      ],
      now: new Date("2026-09-10"),
      sequences: [{ completed_at: null, failed_payment_id: "p1", id: "s1", started_at: "2026-09-01", status: "active" }, { completed_at: null, failed_payment_id: "p2", id: "s2", started_at: "2026-09-01", status: "active" }],
    });
    expect(result.failedPayments.map((row) => row.id)).toEqual(["p1"]);
    expect(result.messages.map((row) => row.id)).toEqual(["m1"]);
    expect(result.events).toHaveLength(1);
    expect(result.sequences.map((row) => row.id)).toEqual(["s1"]);
  });
});
