import { describe, expect, it } from "vitest";
import { verifyMeasurementEvidenceManifest } from "../app/lib/insights-evidence-manifest";
import {
  buildMeasurementQualityMetric,
  buildDataSufficiencyMetric,
  buildDescriptiveBaselineMetric,
  buildCohortComparisonMetric,
  buildMeasurementEvidenceMetric,
  buildInsightsMetrics,
  filterInsightsRows,
  type FailedPaymentMetricRow,
  type RecoveryMessageEventMetricRow,
  type RecoveryMessageMetricRow,
  type RecoverySequenceMetricRow,
} from "../app/lib/server/insights-metrics";

const event = (
  overrides: Partial<RecoveryMessageEventMetricRow> = {},
): RecoveryMessageEventMetricRow => ({
  event_type: "delivered",
  recovery_message_id: "message-1",
  ...overrides,
});

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
  provider_delivery_occurred_at: null,
  provider_delivery_status: null,
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
  it("keeps the complete D5 evidence chain isolated, gated, auditable, and non-causal", () => {
    const evaluatedAt = new Date("2026-10-20T12:00:00.000Z");
    const filter = { environment: "test", period: "30d", segment: "all" } as const;
    const failedPayments = [
      failedPayment({
        amount_due: 7900,
        case_status: "active",
        created_at: "2026-10-10T12:00:00.000Z",
        currency: "eur",
        id: "test-case",
        livemode: false,
      }),
      failedPayment({
        amount_due: 14900,
        case_status: "recovered",
        created_at: "2026-10-10T12:00:00.000Z",
        currency: "eur",
        id: "live-case",
        livemode: true,
        status: "recovered",
      }),
      failedPayment({
        amount_due: 9900,
        case_status: "recovered",
        created_at: "2026-10-10T12:00:00.000Z",
        currency: "eur",
        id: "unconfirmed-case",
        livemode: null,
        status: "recovered",
      }),
    ];
    const messages = [
      message({ failed_payment_id: "test-case", id: "test-message", sequence_id: "test-sequence" }),
      message({ failed_payment_id: "live-case", id: "live-message", sequence_id: "live-sequence" }),
      message({ failed_payment_id: "unconfirmed-case", id: "unconfirmed-message", sequence_id: "unconfirmed-sequence" }),
    ];
    const sequences = [
      sequence({ failed_payment_id: "test-case", id: "test-sequence" }),
      sequence({ failed_payment_id: "live-case", id: "live-sequence" }),
      sequence({ failed_payment_id: "unconfirmed-case", id: "unconfirmed-sequence" }),
    ];
    const events = [
      event({ recovery_message_id: "test-message" }),
      event({ recovery_message_id: "live-message" }),
      event({ recovery_message_id: "unconfirmed-message" }),
    ];
    const selected = filterInsightsRows({
      events,
      failedPayments,
      filter,
      messages,
      now: evaluatedAt,
      sequences,
    });

    expect(selected.failedPayments.map((payment) => payment.id)).toEqual(["test-case"]);
    expect(selected.messages.map((selectedMessage) => selectedMessage.id)).toEqual(["test-message"]);
    expect(selected.sequences.map((selectedSequence) => selectedSequence.id)).toEqual(["test-sequence"]);
    expect(selected.events).toHaveLength(1);

    const insights = buildInsightsMetrics({
      ...selected,
      cohortComparison: buildCohortComparisonMetric(failedPayments, filter, evaluatedAt),
      evaluatedAt,
      filter,
    });

    expect(insights.dataSufficiency.eligible).toBe(false);
    expect(insights.baselineSummary).toMatchObject({
      available: false,
      rows: [],
      title: "Descriptive baseline withheld",
    });
    expect(insights.cohortComparison).toMatchObject({
      available: false,
      rows: [],
      title: "Cohort comparison withheld",
    });
    expect(insights.measurementQuality.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Test / live boundary", value: "Test evidence only" }),
      expect.objectContaining({ label: "Evidence limitation", value: "Descriptive, not causal" }),
    ]));
    expect(insights.measurementEvidence).toMatchObject({
      evaluatedAt: evaluatedAt.toISOString(),
      scope: { environment: "Test evidence (livemode = false)" },
      traceability: { fingerprintAlgorithm: "SHA-256" },
    });
    expect(insights.measurementEvidence.traceability.evidenceFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(insights.measurementEvidence.exportManifest.limitations).toEqual(expect.arrayContaining([
      expect.stringContaining("no row-level"),
      expect.stringContaining("Does not establish causation"),
    ]));
    expect(JSON.stringify(insights.measurementEvidence.exportManifest)).not.toContain("test-case");
    expect(JSON.stringify(insights.measurementEvidence.exportManifest)).not.toContain("live-case");
    expect(verifyMeasurementEvidenceManifest(
      JSON.parse(JSON.stringify(insights.measurementEvidence.exportManifest)),
      insights.measurementEvidence.exportManifest,
    )).toMatchObject({ status: "match", title: "Exact evidence match" });
  });

  it("records exact bounded cohort evidence without changing measurements", () => {
    const filter = { environment: "test", period: "30d", segment: "subscription" } as const;
    const sufficiency = buildDataSufficiencyMetric([], filter);
    const comparison = buildCohortComparisonMetric([], filter, new Date("2026-10-16T12:00:00.000Z"));
    const metric = buildMeasurementEvidenceMetric(
      filter,
      sufficiency,
      comparison,
      new Date("2026-10-16T12:00:00.000Z"),
    );

    expect(metric).toMatchObject({
      boundaries: {
        current: "2026-09-16T12:00:00.000Z ≤ created_at ≤ 2026-10-16T12:00:00.000Z",
        previous: "2026-08-17T12:00:00.000Z ≤ created_at < 2026-09-16T12:00:00.000Z",
      },
      evaluatedAt: "2026-10-16T12:00:00.000Z",
      exportManifest: {
        contractVersion: "revrecovery-insights-v1",
        evaluatedAt: "2026-10-16T12:00:00.000Z",
        fingerprint: {
          algorithm: "SHA-256",
        },
        manifestVersion: "revrecovery-insights-evidence-manifest-v1",
      },
      scope: {
        audience: "Subscription renewals (audience_segment = subscription)",
        environment: "Test evidence (livemode = false)",
      },
      title: "Measurement evidence",
      traceability: {
        contractVersion: "revrecovery-insights-v1",
        fingerprintAlgorithm: "SHA-256",
      },
    });
    expect(metric.traceability.evidenceFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(metric.exportManifest.fingerprint.value).toBe(metric.traceability.evidenceFingerprint);
    expect(metric.gateOutcomes).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Sample size", passed: false }),
      expect.objectContaining({ label: "Adjacent comparison", passed: false }),
    ]));
    expect(metric.definitions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Observed period change" }),
    ]));
  });

  it("states that an all-time view has no preceding cohort boundary", () => {
    const filter = { environment: "live", period: "all", segment: "all" } as const;
    const sufficiency = buildDataSufficiencyMetric([], filter);
    const comparison = buildCohortComparisonMetric([], filter, new Date("2026-10-16T12:00:00.000Z"));
    const metric = buildMeasurementEvidenceMetric(
      filter,
      sufficiency,
      comparison,
      new Date("2026-10-16T12:00:00.000Z"),
    );

    expect(metric.boundaries).toEqual({
      current: "created_at at or before 2026-10-16T12:00:00.000Z",
      previous: "Not defined for all-time evidence",
    });
  });

  it("fingerprints selected evidence deterministically without exposing source rows", () => {
    const evaluatedAt = new Date("2026-10-16T12:00:00.000Z");
    const failedPayments = [
      failedPayment({ amount_due: 7900, currency: "EUR", id: "private-case-b", livemode: false }),
      failedPayment({ amount_due: 4200, currency: "eur", id: "private-case-a", livemode: false }),
    ];
    const messages = [
      message({ failed_payment_id: "private-case-b", id: "private-message-b", sequence_id: "private-sequence-b" }),
      message({ failed_payment_id: "private-case-a", id: "private-message-a", sequence_id: "private-sequence-a" }),
    ];
    const sequences = [
      sequence({ failed_payment_id: "private-case-b", id: "private-sequence-b" }),
      sequence({ failed_payment_id: "private-case-a", id: "private-sequence-a" }),
    ];
    const events = [
      event({ event_type: "opened", recovery_message_id: "private-message-b" }),
      event({ event_type: "delivered", recovery_message_id: "private-message-a" }),
    ];
    const build = (paymentRows: FailedPaymentMetricRow[], reverse = false) => buildInsightsMetrics({
      evaluatedAt,
      events: reverse ? [...events].reverse() : events,
      failedPayments: paymentRows,
      filter: { environment: "test", period: "30d", segment: "all" },
      messages: reverse ? [...messages].reverse() : messages,
      sequences: reverse ? [...sequences].reverse() : sequences,
    }).measurementEvidence;

    const first = build(failedPayments);
    const reordered = build([...failedPayments].reverse(), true);
    const changed = build([
      { ...failedPayments[0], amount_due: 7901 },
      failedPayments[1],
    ]);

    expect(first.traceability.evidenceFingerprint).toBe(reordered.traceability.evidenceFingerprint);
    expect(changed.traceability.evidenceFingerprint).not.toBe(first.traceability.evidenceFingerprint);
    expect(JSON.stringify(first)).not.toContain("private-case");
    expect(JSON.stringify(first)).not.toContain("private-message");
    expect(JSON.stringify(first.exportManifest)).not.toContain("private-sequence");
    expect(first.exportManifest).toMatchObject({
      boundaries: first.boundaries,
      contractVersion: first.traceability.contractVersion,
      definitions: first.definitions,
      evaluatedAt: first.evaluatedAt,
      fingerprint: {
        algorithm: first.traceability.fingerprintAlgorithm,
        value: first.traceability.evidenceFingerprint,
      },
      gates: first.gateOutcomes,
      scope: first.scope,
    });
    expect(Object.keys(first.exportManifest).sort()).toEqual([
      "boundaries",
      "contractVersion",
      "definitions",
      "evaluatedAt",
      "fingerprint",
      "gates",
      "limitations",
      "manifestVersion",
      "scope",
    ]);
    expect(first.exportManifest.limitations).toEqual(expect.arrayContaining([
      expect.stringContaining("no row-level"),
      expect.stringContaining("Does not establish causation"),
    ]));
  });

  it("withholds adjacent-period comparisons unless both cohorts pass independently", () => {
    const metric = buildCohortComparisonMetric([
      failedPayment({ amount_due: 7900, case_status: "active", created_at: "2026-10-10T00:00:00.000Z", currency: "eur", livemode: false }),
    ], { environment: "test", period: "30d", segment: "all" }, new Date("2026-10-16T00:00:00.000Z"));

    expect(metric).toMatchObject({
      available: false,
      currentLabel: "Current 30 days",
      previousLabel: "Previous 30 days",
      rows: [],
      title: "Cohort comparison withheld",
    });
  });

  it("shows observed changes only when adjacent cohorts both pass", () => {
    const makeCohort = (period: "current" | "previous") => Array.from({ length: 30 }, (_, index) => {
      const recoveredLimit = period === "current" ? 12 : 6;
      const caseStatus = index < recoveredLimit ? "recovered" : index < 24 ? "exhausted" : "active";
      return failedPayment({
        amount_due: 1000,
        case_status: caseStatus,
        created_at: period === "current" ? "2026-10-10T00:00:00.000Z" : "2026-09-10T00:00:00.000Z",
        currency: "eur",
        id: `${period}-${index}`,
        livemode: false,
        status: caseStatus === "recovered" ? "recovered" : "active",
      });
    });
    const metric = buildCohortComparisonMetric(
      [...makeCohort("current"), ...makeCohort("previous")],
      { environment: "test", period: "30d", segment: "all" },
      new Date("2026-10-16T00:00:00.000Z"),
    );

    expect(metric.available).toBe(true);
    expect(metric.rows).toEqual([
      expect.objectContaining({ label: "Selected cases", observedChange: "No observed change" }),
      expect.objectContaining({ label: "Outcome maturity", observedChange: "No observed change" }),
      expect.objectContaining({
        current: "50%",
        label: "Terminal recovery share",
        observedChange: "+25 percentage points observed",
        previous: "25%",
      }),
    ]);
    expect(metric.summary).toContain("not performance lift, attribution, or incremental revenue");
  });

  it("does not infer a previous cohort for all-time evidence", () => {
    const metric = buildCohortComparisonMetric([], { environment: "live", period: "all", segment: "all" });

    expect(metric).toMatchObject({
      available: false,
      rows: [],
      title: "Cohort comparison unavailable",
    });
  });

  it("withholds every descriptive baseline value when sufficiency gates are waiting", () => {
    const metric = buildDescriptiveBaselineMetric([
      failedPayment({ amount_due: 7900, case_status: "active", currency: "eur", livemode: false }),
    ], { environment: "test", period: "30d", segment: "all" });

    expect(metric).toMatchObject({
      available: false,
      rows: [],
      title: "Descriptive baseline withheld",
    });
    expect(metric.summary).not.toContain("€79.00");
  });

  it("shows only descriptive cohort facts after every readiness gate passes", () => {
    const payments = Array.from({ length: 30 }, (_, index) => failedPayment({
      amount_due: 1000,
      case_status: index < 12 ? "recovered" : index < 24 ? "exhausted" : "active",
      currency: "eur",
      id: `payment-${index}`,
      livemode: false,
      status: index < 12 ? "recovered" : "active",
    }));
    const metric = buildDescriptiveBaselineMetric(
      payments,
      { environment: "test", period: "all", segment: "subscription" },
    );

    expect(metric).toMatchObject({
      available: true,
      title: "Descriptive cohort baseline",
    });
    expect(metric.rows).toEqual([
      expect.objectContaining({ label: "Selected cohort", value: "30 cases" }),
      expect.objectContaining({ label: "Terminal outcomes", value: "24 cases" }),
      expect.objectContaining({ label: "Observed terminal recovery share", value: "50%" }),
      expect.objectContaining({ label: "Failure-time amount represented", value: "€300.00" }),
    ]);
    expect(metric.summary).toContain("not a control group or performance lift claim");
  });

  it("withholds baseline eligibility until every sufficiency gate passes", () => {
    const metric = buildDataSufficiencyMetric([
      failedPayment({ amount_due: 7900, case_status: "active", currency: "eur", livemode: false }),
      failedPayment({ amount_due: 7900, case_status: "recovered", currency: null, id: "payment-2", livemode: false }),
    ], { environment: "test", period: "30d", segment: "all" });

    expect(metric).toMatchObject({
      eligible: false,
      title: "Not yet eligible for baseline",
    });
    expect(metric.gates).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Sample size", passed: false, value: "2 of 30 cases" }),
      expect.objectContaining({ label: "Outcome maturity", passed: false, value: "50% terminal" }),
      expect.objectContaining({ label: "Monetary evidence", passed: false, value: "1 of 2 complete" }),
      expect.objectContaining({ label: "Environment certainty", passed: true, value: "Test evidence confirmed" }),
    ]));
  });

  it("allows a descriptive test baseline only when all evidence gates pass", () => {
    const payments = Array.from({ length: 30 }, (_, index) => failedPayment({
      amount_due: 7900,
      case_status: index < 24 ? "recovered" : "active",
      currency: "eur",
      id: `payment-${index}`,
      livemode: false,
    }));
    const metric = buildDataSufficiencyMetric(payments, { environment: "test", period: "all", segment: "all" });

    expect(metric.eligible).toBe(true);
    expect(metric.title).toBe("Eligible for descriptive baseline");
    expect(metric.gates.every((gate) => gate.passed)).toBe(true);
    expect(metric.summary).toContain("remains test evidence");
  });

  it("never treats unconfirmed environment evidence as baseline-ready", () => {
    const payments = Array.from({ length: 30 }, (_, index) => failedPayment({
      amount_due: 7900,
      case_status: "recovered",
      currency: "eur",
      id: `payment-${index}`,
      livemode: null,
    }));
    const metric = buildDataSufficiencyMetric(payments, { environment: "unconfirmed", period: "all", segment: "all" });

    expect(metric.eligible).toBe(false);
    expect(metric.gates.find((gate) => gate.label === "Environment certainty")).toMatchObject({
      passed: false,
      value: "Environment evidence incomplete",
    });
  });

  it("describes cohort quality without changing headline calculations", () => {
    const metric = buildMeasurementQualityMetric([
      failedPayment({ case_status: "active", livemode: false }),
      failedPayment({ case_status: "recovered", id: "payment-2", livemode: true }),
    ], { environment: "test", period: "30d", segment: "subscription" });

    expect(metric.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: "Cohort definition",
        value: "Failures first recorded in the last 30 days · subscription renewals",
      }),
      expect.objectContaining({
        label: "Outcome maturity",
        status: "attention",
        value: "Outcomes still maturing",
      }),
      expect.objectContaining({
        label: "Test / live boundary",
        status: "attention",
        value: "Unexpected mixed evidence",
      }),
      expect.objectContaining({
        label: "Amount basis",
        value: "Failure-time amount due",
      }),
      expect.objectContaining({
        label: "Evidence limitation",
        value: "Descriptive, not causal",
      }),
    ]));
  });

  it("does not present missing cohort evidence as a measured zero", () => {
    const metric = buildMeasurementQualityMetric([], { environment: "unconfirmed", period: "all", segment: "all" });

    expect(metric.items.find((item) => item.label === "Outcome maturity")).toMatchObject({
      status: "clear",
      value: "Awaiting cohort evidence",
    });
    expect(metric.items.find((item) => item.label === "Test / live boundary")).toMatchObject({
      value: "No evidence selected",
    });
  });

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

  it("reports provider delivery health separately from payment recovery", () => {
    const insights = buildInsightsMetrics({
      failedPayments: [failedPayment()],
      messages: [
        message({
          provider_delivery_occurred_at: "2026-08-01T11:01:00.000Z",
          provider_delivery_status: "delivered",
          sent_at: "2026-08-01T11:00:00.000Z",
          status: "sent",
        }),
        message({
          message_key: "email_2",
          provider_delivery_occurred_at: "2026-08-01T12:01:00.000Z",
          provider_delivery_status: "bounced",
          sent_at: "2026-08-01T12:00:00.000Z",
          status: "sent",
          step_number: 2,
        }),
        message({
          message_key: "email_3",
          provider_delivery_occurred_at: "2026-08-01T13:01:00.000Z",
          provider_delivery_status: "delivery_delayed",
          sent_at: "2026-08-01T13:00:00.000Z",
          status: "sent",
          step_number: 3,
        }),
        message({
          message_key: "email_4",
          provider_delivery_status: "sent",
          sent_at: "2026-08-01T14:00:00.000Z",
          status: "sent",
          step_number: 4,
        }),
      ],
      sequences: [sequence()],
    });

    expect(insights.deliveryHealth).toEqual({
      deliveryRate: 50,
      rows: [
        { label: "Accepted by email provider", value: 4 },
        { label: "Confirmed delivered", value: 1 },
        { label: "Temporarily delayed", value: 1 },
        { label: "Bounced", value: 1 },
        { label: "Complaints", value: 0 },
        { label: "Failed, suppressed, or canceled", value: 0 },
      ],
      terminalOutcomeCount: 2,
    });
    expect(insights.sequenceSummary[0]?.value).toBe("0%");
  });

  it("does not claim a delivery rate before a terminal provider outcome exists", () => {
    const insights = buildInsightsMetrics({
      failedPayments: [],
      messages: [
        message({ provider_delivery_status: "sent", status: "sent" }),
        message({
          message_key: "email_2",
          provider_delivery_status: "delivery_delayed",
          status: "sent",
          step_number: 2,
        }),
      ],
      sequences: [],
    });

    expect(insights.deliveryHealth.deliveryRate).toBeNull();
    expect(insights.deliveryHealth.terminalOutcomeCount).toBe(0);
  });

  it("counts engagement once per confirmed-delivered recovery message", () => {
    const insights = buildInsightsMetrics({
      events: [
        event(),
        event({ event_type: "opened" }),
        event({ event_type: "opened" }),
        event({ event_type: "clicked" }),
        event({ event_type: "clicked" }),
        event({ recovery_message_id: "message-2" }),
        event({ event_type: "opened", recovery_message_id: "message-2" }),
      ],
      failedPayments: [],
      messages: [],
      sequences: [],
    });

    expect(insights.emailEngagement).toEqual({
      clickedCount: 1,
      clickRate: 50,
      deliveredCount: 2,
      openedCount: 2,
      openRate: 100,
    });
  });

  it("excludes unmatched and unconfirmed engagement from rates", () => {
    const insights = buildInsightsMetrics({
      events: [
        event({ event_type: "opened", recovery_message_id: null }),
        event({ event_type: "clicked", recovery_message_id: "message-without-delivery" }),
      ],
      failedPayments: [],
      messages: [],
      sequences: [],
    });

    expect(insights.emailEngagement).toEqual({
      clickedCount: 0,
      clickRate: null,
      deliveredCount: 0,
      openedCount: 0,
      openRate: null,
    });
  });
});
