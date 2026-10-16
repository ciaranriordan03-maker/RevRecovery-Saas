import { describe, expect, it } from "vitest";
import { filterInsightsRows, normalizeInsightsFilter } from "../app/lib/server/insights-metrics";

describe("Phase 3 insight filters", () => {
  it("normalizes unsupported query values", () => {
    expect(normalizeInsightsFilter({ environment: "bad", period: "bad", segment: "bad" }, "test"))
      .toEqual({ environment: "test", period: "30d", segment: "all" });
  });

  it("accepts only one explicit evidence environment", () => {
    expect(normalizeInsightsFilter({ environment: "live" })).toMatchObject({ environment: "live" });
    expect(normalizeInsightsFilter({ environment: "test" })).toMatchObject({ environment: "test" });
    expect(normalizeInsightsFilter({ environment: "unconfirmed" })).toMatchObject({ environment: "unconfirmed" });
    expect(normalizeInsightsFilter({ environment: "all" }, "live")).toMatchObject({ environment: "live" });
  });

  it("filters every related dataset from the selected case cohort", () => {
    const result = filterInsightsRows({
      events: [{ event_type: "opened", recovery_message_id: "m1" }, { event_type: "opened", recovery_message_id: "m2" }],
      failedPayments: [
        { audience_segment: "subscription", created_at: "2026-09-01", id: "p1", last_event_type: "invoice.payment_failed", livemode: false, recovered_at: null, status: "failed" },
        { audience_segment: "standalone", created_at: "2026-09-01", id: "p2", last_event_type: "invoice.payment_failed", livemode: false, recovered_at: null, status: "failed" },
      ],
      filter: { environment: "test", period: "30d", segment: "subscription" },
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

  it("never combines live, test, and unconfirmed evidence", () => {
    const failedPayments = [
      { created_at: "2026-09-01", id: "live", last_event_type: "invoice.payment_failed", livemode: true, recovered_at: null, status: "failed" },
      { created_at: "2026-09-01", id: "test", last_event_type: "invoice.payment_failed", livemode: false, recovered_at: null, status: "failed" },
      { created_at: "2026-09-01", id: "legacy", last_event_type: "invoice.payment_failed", livemode: null, recovered_at: null, status: "failed" },
    ];
    const select = (environment: "live" | "test" | "unconfirmed") => filterInsightsRows({
      events: [],
      failedPayments,
      filter: { environment, period: "all", segment: "all" },
      messages: [],
      sequences: [],
    }).failedPayments.map((row) => row.id);

    expect(select("live")).toEqual(["live"]);
    expect(select("test")).toEqual(["test"]);
    expect(select("unconfirmed")).toEqual(["legacy"]);
  });

  it("keeps cohort membership inside the exact evaluation boundary", () => {
    const result = filterInsightsRows({
      events: [],
      failedPayments: [
        { created_at: "2026-09-10T00:00:00.000Z", id: "inside", last_event_type: "invoice.payment_failed", livemode: false, recovered_at: null, status: "active" },
        { created_at: "2026-10-11T00:00:00.000Z", id: "future", last_event_type: "invoice.payment_failed", livemode: false, recovered_at: null, status: "active" },
        { created_at: "not-a-date", id: "invalid", last_event_type: "invoice.payment_failed", livemode: false, recovered_at: null, status: "active" },
      ],
      filter: { environment: "test", period: "all", segment: "all" },
      messages: [],
      now: new Date("2026-10-10T00:00:00.000Z"),
      sequences: [],
    });

    expect(result.failedPayments.map((payment) => payment.id)).toEqual(["inside"]);
  });
});
