import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildRecoveryCaseTimeline } from "../app/lib/server/recovery-case-events";

describe("recovery case timeline read model", () => {
  it("returns only the safe case-oriented event DTO", () => {
    expect(buildRecoveryCaseTimeline([
      {
        event_type: "invoice.payment_failed",
        id: "event-1",
        livemode: false,
        metadata: { attempt_count: 1 },
        occurred_at: "2026-09-22T09:00:00.000Z",
        recorded_at: "2026-09-22T09:00:01.000Z",
        source: "stripe",
      },
    ])).toEqual([
      {
        eventType: "invoice.payment_failed",
        id: "event-1",
        livemode: false,
        metadata: { attempt_count: 1 },
        occurredAt: "2026-09-22T09:00:00.000Z",
        recordedAt: "2026-09-22T09:00:01.000Z",
        source: "stripe",
      },
    ]);
  });

  it("normalizes missing legacy metadata to an empty object", () => {
    expect(buildRecoveryCaseTimeline([
      {
        event_type: "case_status_changed",
        id: "event-2",
        livemode: true,
        metadata: null,
        occurred_at: "2026-09-22T10:00:00.000Z",
        recorded_at: "2026-09-22T10:00:01.000Z",
        source: "case_transition",
      },
    ])[0].metadata).toEqual({});
  });

  it("scopes timeline reads by both tenant and failed-payment case", () => {
    const source = readFileSync(
      new URL("../app/lib/server/recovery-case-events.ts", import.meta.url),
      "utf8",
    );

    expect(source).toContain('.eq("user_id", userId)');
    expect(source).toContain('.eq("failed_payment_id", failedPaymentId)');
    expect(source).toContain('.order("occurred_at", { ascending: true })');
  });
});
