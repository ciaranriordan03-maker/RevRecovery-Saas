import { describe, expect, it } from "vitest";
import {
  buildInsightsMetrics,
  type FailedPaymentMetricRow,
  type RecoveryMessageMetricRow,
  type RecoverySequenceMetricRow,
} from "../app/lib/server/insights-metrics";

const failedPayment = (
  overrides: Partial<FailedPaymentMetricRow> = {},
): FailedPaymentMetricRow => ({
  created_at: "2026-08-01T10:00:00.000Z",
  id: "payment-1",
  last_event_type: "invoice.payment_failed",
  recovered_at: null,
  status: "active",
  ...overrides,
});

const message = (
  overrides: Partial<RecoveryMessageMetricRow> = {},
): RecoveryMessageMetricRow => ({
  failed_payment_id: "payment-1",
  message_key: "email_1",
  sequence_id: "sequence-1",
  sent_at: null,
  status: "pending",
  step_number: 1,
  ...overrides,
});

const sequence = (
  overrides: Partial<RecoverySequenceMetricRow> = {},
): RecoverySequenceMetricRow => ({
  completed_at: null,
  id: "sequence-1",
  started_at: "2026-08-01T10:00:00.000Z",
  status: "active",
  ...overrides,
});

describe("Insights metrics", () => {
  it("counts only explicitly recovered sequences as recovered", () => {
    const insights = buildInsightsMetrics({
      failedPayments: [
        failedPayment({
          recovered_at: "2026-08-01T12:00:00.000Z",
          status: "recovered",
        }),
      ],
      messages: [],
      sequences: [
        sequence({ completed_at: "2026-08-01T12:00:00.000Z", status: "recovered" }),
        sequence({ id: "sequence-2", completed_at: "2026-08-02T12:00:00.000Z", status: "exhausted" }),
        sequence({ id: "sequence-3", completed_at: "2026-08-03T12:00:00.000Z", status: "canceled_by_merchant" }),
      ],
    });

    expect(insights.sequenceSummary[0]).toEqual({
      caption: "1 of 3 sequences recovered",
      label: "Sequence Recovery Rate",
      value: "33%",
    });
  });

  it("reports Phase 0 delivery states without hiding retryable or terminal failures", () => {
    const insights = buildInsightsMetrics({
      failedPayments: [failedPayment()],
      messages: [
        message({ status: "pending" }),
        message({ message_key: "email_2", status: "claimed", step_number: 2 }),
        message({ message_key: "email_3", status: "paused", step_number: 3 }),
        message({ message_key: "email_4", status: "failed_retryable", step_number: 4 }),
        message({ message_key: "email_5", status: "failed_terminal", step_number: 5 }),
        message({ message_key: "email_6", status: "canceled", step_number: 6 }),
      ],
      sequences: [sequence()],
    });

    expect(insights.cards[0]?.rows[1]?.value).toBe("3");
    expect(insights.funnel[1]).toMatchObject({
      label: "Messages awaiting completion",
      value: "3",
    });
    expect(insights.funnel[2]).toMatchObject({
      label: "Canceled or failed messages",
      value: "3",
    });
  });

  it("uses attribution language and attributes a recovery to the latest prior email", () => {
    const insights = buildInsightsMetrics({
      failedPayments: [
        failedPayment({
          recovered_at: "2026-08-01T13:00:00.000Z",
          status: "recovered",
        }),
      ],
      messages: [
        message({ sent_at: "2026-08-01T11:00:00.000Z", status: "sent" }),
        message({
          message_key: "email_2",
          sent_at: "2026-08-01T12:00:00.000Z",
          status: "sent",
          step_number: 2,
        }),
      ],
      sequences: [sequence({ status: "recovered" })],
    });

    expect(insights.emailRecovery).toEqual([
      { label: "Email 1", recoveredCount: 0, recoveryRate: 0, sentCount: 1, stepNumber: 1 },
      { label: "Email 2", recoveredCount: 1, recoveryRate: 100, sentCount: 1, stepNumber: 2 },
    ]);
    expect(insights.cards[0]?.title).toBe("Email Delivery");
    expect(insights.cards[1]?.rows[1]?.label).toBe("Most common Stripe event");
  });
});
