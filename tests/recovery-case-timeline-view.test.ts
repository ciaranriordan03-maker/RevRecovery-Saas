import { describe, expect, it } from "vitest";
import { buildRecoveryCaseTimelineView } from "../app/lib/recovery/case-timeline-view";
import type { RecoveryCaseTimelineEvent } from "../app/lib/server/recovery-case-events";

function event(overrides: Partial<RecoveryCaseTimelineEvent>): RecoveryCaseTimelineEvent {
  return {
    eventType: "invoice.payment_failed",
    id: "event-1",
    livemode: false,
    metadata: {},
    occurredAt: "2026-09-22T09:00:00.000Z",
    recordedAt: "2026-09-22T09:00:01.000Z",
    source: "stripe",
    ...overrides,
  };
}

describe("recovery case timeline presentation", () => {
  it("describes Stripe failures using only persisted facts", () => {
    expect(buildRecoveryCaseTimelineView(event({
      metadata: { attempt_count: 2, decline_code: "insufficient_funds" },
    }))).toMatchObject({
      detail: "Stripe recorded payment attempt 2. Decline code: Insufficient Funds.",
      sourceLabel: "Stripe",
      title: "Payment failed",
      tone: "danger",
    });
  });

  it("presents a confirmed paid invoice as recovered", () => {
    expect(buildRecoveryCaseTimelineView(event({ eventType: "invoice.paid" }))).toMatchObject({
      detail: "Stripe confirmed that the invoice was paid.",
      title: "Payment recovered",
      tone: "success",
    });
  });

  it("keeps email-open language directional", () => {
    const view = buildRecoveryCaseTimelineView(event({
      eventType: "email_opened",
      source: "provider_message_event",
    }));
    expect(view.detail).toContain("can be approximate");
    expect(view.detail).not.toMatch(/caused|proved/i);
  });

  it("uses exactly one sentence-ending period for recovery message events", () => {
    expect(buildRecoveryCaseTimelineView(event({
      eventType: "recovery_message_scheduled",
      metadata: { step_number: 1 },
      source: "recovery_message_schedule",
    })).detail).toBe("Recovery email 1 was added to the schedule.");

    expect(buildRecoveryCaseTimelineView(event({
      eventType: "recovery_message_paused",
      metadata: { step_number: 2 },
      source: "recovery_message_status",
    })).detail).toBe("Recovery email 2 was paused.");
  });

  it("falls back safely for future event types", () => {
    expect(buildRecoveryCaseTimelineView(event({ eventType: "invoice.future_event" }))).toMatchObject({
      detail: "Stripe recorded this event.",
      title: "Invoice Future Event",
      tone: "neutral",
    });
  });
});
