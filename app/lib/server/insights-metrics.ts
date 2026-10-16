import "server-only";

import { createSupabaseAdminClient } from "../supabase/admin";
import { aggregateCurrencyAmounts, formatCurrencyAmounts } from "../currency";

export type InsightFunnelMetric = {
  barClass: string;
  label: string;
  trackClass: string;
  value: string;
};

export type InsightCardMetric = {
  icon: string;
  iconClass: string;
  rows: {
    label: string;
    rowClass: string;
    value: string;
    valueClass: string;
  }[];
  title: string;
};

export type InsightsMetrics = {
  cards: InsightCardMetric[];
  dataSufficiency: DataSufficiencyMetric;
  deliveryHealth: DeliveryHealthMetric;
  emailEngagement: EmailEngagementMetric;
  emailRecovery: EmailRecoveryMetric[];
  funnel: InsightFunnelMetric[];
  measurementQuality: MeasurementQualityMetric;
  sequenceSummary: SequenceSummaryMetric[];
  segmentBreakdown: SegmentMetric[];
};

export type DataSufficiencyMetric = {
  eligible: boolean;
  gates: {
    detail: string;
    label: string;
    passed: boolean;
    value: string;
  }[];
  summary: string;
  title: string;
};

export type MeasurementQualityMetric = {
  items: {
    detail: string;
    label: string;
    status: "attention" | "clear" | "informational";
    value: string;
  }[];
  summary: string;
  title: string;
};

export type SegmentMetric = {
  amountDueOnRecoveredInvoices: string;
  averageRecoveryTime: string;
  clickRate: number | null;
  deliveryRate: number | null;
  label: string;
  openCount: number;
  openRate: number | null;
  recoveredCount: number;
  recoveryRate: number;
  sentCount: number;
  totalCount: number;
};

export type EmailEngagementMetric = {
  clickedCount: number;
  clickRate: number | null;
  deliveredCount: number;
  openedCount: number;
  openRate: number | null;
};

export type RecoveryMessageEventMetricRow = {
  event_type: string;
  recovery_message_id: string | null;
};

export const INSIGHT_PERIODS = ["30d", "90d", "all"] as const;
export const INSIGHT_SEGMENTS = ["all", "subscription", "standalone", "unknown"] as const;
export const INSIGHT_ENVIRONMENTS = ["live", "test", "unconfirmed"] as const;
export type InsightPeriod = (typeof INSIGHT_PERIODS)[number];
export type InsightSegment = (typeof INSIGHT_SEGMENTS)[number];
export type InsightEnvironment = (typeof INSIGHT_ENVIRONMENTS)[number];
export type InsightsFilter = {
  environment: InsightEnvironment;
  period: InsightPeriod;
  segment: InsightSegment;
};

export type DeliveryHealthMetric = {
  deliveryRate: number | null;
  rows: {
    label: string;
    value: number;
  }[];
  terminalOutcomeCount: number;
};

export type RecoveryMessageMetricRow = {
  id?: string;
  failed_payment_id: string;
  message_key: string;
  provider_delivery_occurred_at: string | null;
  provider_delivery_status: string | null;
  sequence_id: string;
  sent_at: string | null;
  step_number: number;
  status: string;
};

export type FailedPaymentMetricRow = {
  amount_due?: number;
  audience_segment?: string;
  case_status?: string | null;
  created_at: string;
  currency?: string | null;
  id: string;
  last_event_type: string;
  livemode?: boolean | null;
  recovered_at: string | null;
  status: string;
};

export type RecoverySequenceMetricRow = {
  completed_at: string | null;
  id: string;
  failed_payment_id?: string;
  started_at: string;
  status: string;
};

export type EmailRecoveryMetric = {
  label: string;
  recoveryRate: number;
  recoveredCount: number;
  sentCount: number;
  stepNumber: number;
};

export type SequenceSummaryMetric = {
  caption: string;
  label: string;
  value: string;
};

const FAILED_PAYMENTS_TABLE = "failed_payments";
const RECOVERY_MESSAGE_EVENTS_TABLE = "recovery_message_events";
const RECOVERY_MESSAGES_TABLE = "recovery_messages";
const RECOVERY_SEQUENCES_TABLE = "recovery_sequences";

function percent(part: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((part / total) * 100);
}

function getWidthClass(value: number) {
  if (value <= 0) {
    return "w-0";
  }

  if (value <= 25) {
    return "w-1/4";
  }

  if (value <= 50) {
    return "w-1/2";
  }

  if (value <= 75) {
    return "w-3/4";
  }

  return "w-full";
}

function formatPercent(value: number) {
  return `${value}%`;
}

function formatMessageLabel(messageKey: string, stepNumber?: number) {
  const normalizedKey = messageKey.replace(/_/g, " ");
  const fallbackLabel = normalizedKey.charAt(0).toUpperCase() + normalizedKey.slice(1);

  if (!stepNumber) {
    return fallbackLabel;
  }

  return `Email ${stepNumber}`;
}

function formatRecoveryTime(hours: number | null) {
  if (hours === null) {
    return "No recoveries yet";
  }

  if (hours < 24) {
    return `${Math.max(1, Math.round(hours))}h`;
  }

  const days = hours / 24;
  return `${Math.max(1, Math.round(days))}d`;
}

function hoursBetween(start: string, end: string) {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
    return null;
  }

  return (endMs - startMs) / (1000 * 60 * 60);
}

function getMostSentEmail(messages: RecoveryMessageMetricRow[]) {
  const sentMessages = messages.filter((message) => message.status === "sent");

  if (sentMessages.length === 0) {
    return {
      label: "No emails sent yet",
      value: "Waiting for first send",
    };
  }

  const counts = sentMessages.reduce<Record<string, number>>((totals, message) => {
    totals[message.message_key] = (totals[message.message_key] ?? 0) + 1;
    return totals;
  }, {});
  const [messageKey, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

  return {
    label: messageKey.replace("_", " ").toUpperCase(),
    value: `${count} sent`,
  };
}

function getMostCommonFailure(rows: FailedPaymentMetricRow[]) {
  const counts = rows.reduce<Record<string, number>>((totals, row) => {
    totals[row.last_event_type] = (totals[row.last_event_type] ?? 0) + 1;
    return totals;
  }, {});
  const firstEntry = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

  return firstEntry?.[0] ?? "No failures yet";
}

async function getRecoveryMessageRows(userId: string) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from(RECOVERY_MESSAGES_TABLE)
    .select(
      "id, failed_payment_id, message_key, provider_delivery_occurred_at, provider_delivery_status, sequence_id, sent_at, step_number, status",
    )
    .eq("user_id", userId)
    .returns<RecoveryMessageMetricRow[]>();

  if (error) {
    throw new Error(`Unable to load insight recovery messages: ${error.message}`);
  }

  return data ?? [];
}

async function getRecoveryMessageEventRows(userId: string) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from(RECOVERY_MESSAGE_EVENTS_TABLE)
    .select("event_type, recovery_message_id")
    .eq("user_id", userId)
    .in("event_type", ["delivered", "opened", "clicked"])
    .not("recovery_message_id", "is", null)
    .returns<RecoveryMessageEventMetricRow[]>();

  if (error) {
    throw new Error(`Unable to load insight recovery message events: ${error.message}`);
  }

  return data ?? [];
}

async function getFailedPaymentRows(userId: string) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from(FAILED_PAYMENTS_TABLE)
    .select("amount_due, audience_segment, case_status, created_at, currency, id, last_event_type, livemode, recovered_at, status")
    .eq("user_id", userId)
    .returns<FailedPaymentMetricRow[]>();

  if (error) {
    throw new Error(`Unable to load insight failed payments: ${error.message}`);
  }

  return data ?? [];
}

async function getRecoverySequenceRows(userId: string) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from(RECOVERY_SEQUENCES_TABLE)
    .select("completed_at, failed_payment_id, id, started_at, status")
    .eq("user_id", userId)
    .returns<RecoverySequenceMetricRow[]>();

  if (error) {
    throw new Error(`Unable to load insight recovery sequences: ${error.message}`);
  }

  return data ?? [];
}

function buildEmailRecoveryMetrics(
  messages: RecoveryMessageMetricRow[],
  failedPayments: FailedPaymentMetricRow[],
): EmailRecoveryMetric[] {
  const recoveredPaymentById = new Map(
    failedPayments
      .filter((payment) => payment.status === "recovered" && payment.recovered_at)
      .map((payment) => [payment.id, payment]),
  );
  const sentMessages = messages.filter((message) => message.status === "sent" && message.sent_at);
  const sentMessagesByPayment = sentMessages.reduce<Record<string, RecoveryMessageMetricRow[]>>(
    (groups, message) => {
      groups[message.failed_payment_id] = groups[message.failed_payment_id] ?? [];
      groups[message.failed_payment_id].push(message);
      return groups;
    },
    {},
  );
  const creditedRecoveryByStep = new Map<number, number>();

  for (const [failedPaymentId, paymentMessages] of Object.entries(sentMessagesByPayment)) {
    const recoveredPayment = recoveredPaymentById.get(failedPaymentId);

    if (!recoveredPayment?.recovered_at) {
      continue;
    }

    const recoveredAtMs = new Date(recoveredPayment.recovered_at).getTime();
    const latestSentMessage = paymentMessages
      .filter((message) => {
        const sentAtMs = new Date(message.sent_at ?? "").getTime();
        return Number.isFinite(sentAtMs) && sentAtMs <= recoveredAtMs;
      })
      .sort((a, b) => {
        const aSentAt = new Date(a.sent_at ?? "").getTime();
        const bSentAt = new Date(b.sent_at ?? "").getTime();
        return bSentAt - aSentAt;
      })[0];

    if (latestSentMessage) {
      creditedRecoveryByStep.set(
        latestSentMessage.step_number,
        (creditedRecoveryByStep.get(latestSentMessage.step_number) ?? 0) + 1,
      );
    }
  }

  const rowsByStep = new Map<number, RecoveryMessageMetricRow[]>();

  for (const message of messages) {
    rowsByStep.set(message.step_number, [...(rowsByStep.get(message.step_number) ?? []), message]);
  }

  return Array.from(rowsByStep.entries())
    .sort(([a], [b]) => a - b)
    .map(([stepNumber, stepMessages]) => {
      const sentCount = stepMessages.filter((message) => message.status === "sent").length;
      const recoveredCount = creditedRecoveryByStep.get(stepNumber) ?? 0;
      const sampleMessage = stepMessages[0];

      return {
        label: formatMessageLabel(sampleMessage?.message_key ?? `email_${stepNumber}`, stepNumber),
        recoveredCount,
        recoveryRate: percent(recoveredCount, sentCount),
        sentCount,
        stepNumber,
      };
    });
}

function buildSequenceSummaryMetrics(
  sequences: RecoverySequenceMetricRow[],
  failedPayments: FailedPaymentMetricRow[],
): SequenceSummaryMetric[] {
  const recoveredPayments = failedPayments.filter(
    (payment) => payment.status === "recovered" && payment.recovered_at,
  );
  const recoveredSequenceCount = sequences.filter(
    (sequence) => sequence.status === "recovered",
  ).length;
  const conversionRate = percent(recoveredSequenceCount, sequences.length);
  const recoveryHours = recoveredPayments
    .map((payment) => hoursBetween(payment.created_at, payment.recovered_at ?? ""))
    .filter((value): value is number => value !== null);
  const averageRecoveryHours = recoveryHours.length > 0
    ? recoveryHours.reduce((total, value) => total + value, 0) / recoveryHours.length
    : null;

  return [
    {
      caption: `${recoveredSequenceCount} of ${sequences.length} sequences recovered`,
      label: "Sequence Recovery Rate",
      value: formatPercent(conversionRate),
    },
    {
      caption: recoveredPayments.length > 0
        ? "From failure detected to payment recovered"
        : "Waiting for first recovered payment",
      label: "Average Recovery Time",
      value: formatRecoveryTime(averageRecoveryHours),
    },
  ];
}

function buildDeliveryHealthMetric(
  messages: RecoveryMessageMetricRow[],
): DeliveryHealthMetric {
  const countProviderStatus = (status: string) =>
    messages.filter((message) => message.provider_delivery_status === status).length;
  const deliveredCount = countProviderStatus("delivered");
  const bouncedCount = countProviderStatus("bounced");
  const complainedCount = countProviderStatus("complained");
  const failedCount = countProviderStatus("failed");
  const suppressedCount = countProviderStatus("suppressed");
  const canceledCount = countProviderStatus("canceled");
  const terminalOutcomeCount =
    deliveredCount +
    bouncedCount +
    complainedCount +
    failedCount +
    suppressedCount +
    canceledCount;

  return {
    deliveryRate:
      terminalOutcomeCount > 0 ? percent(deliveredCount, terminalOutcomeCount) : null,
    rows: [
      {
        label: "Accepted by email provider",
        value: messages.filter((message) => message.status === "sent").length,
      },
      { label: "Confirmed delivered", value: deliveredCount },
      {
        label: "Temporarily delayed",
        value: countProviderStatus("delivery_delayed"),
      },
      { label: "Bounced", value: bouncedCount },
      { label: "Complaints", value: complainedCount },
      {
        label: "Failed, suppressed, or canceled",
        value: failedCount + suppressedCount + canceledCount,
      },
    ],
    terminalOutcomeCount,
  };
}

function buildEmailEngagementMetric(
  events: RecoveryMessageEventMetricRow[],
): EmailEngagementMetric {
  const messageIdsByEvent = (eventType: string) =>
    new Set(
      events
        .filter(
          (event) =>
            event.event_type === eventType && Boolean(event.recovery_message_id),
        )
        .map((event) => event.recovery_message_id as string),
    );
  const deliveredMessageIds = messageIdsByEvent("delivered");
  const openedMessageIds = messageIdsByEvent("opened");
  const clickedMessageIds = messageIdsByEvent("clicked");
  const openedCount = Array.from(openedMessageIds).filter((messageId) =>
    deliveredMessageIds.has(messageId),
  ).length;
  const clickedCount = Array.from(clickedMessageIds).filter((messageId) =>
    deliveredMessageIds.has(messageId),
  ).length;
  const deliveredCount = deliveredMessageIds.size;

  return {
    clickedCount,
    clickRate: deliveredCount > 0 ? percent(clickedCount, deliveredCount) : null,
    deliveredCount,
    openedCount,
    openRate: deliveredCount > 0 ? percent(openedCount, deliveredCount) : null,
  };
}

function buildSegmentMetrics(
  rows: FailedPaymentMetricRow[],
  messages: RecoveryMessageMetricRow[],
  events: RecoveryMessageEventMetricRow[],
): SegmentMetric[] {
  const labels: Record<string, string> = {
    standalone: "Standalone invoices",
    subscription: "Recurring subscriptions",
    unknown: "Unknown invoice type",
  };

  return ["subscription", "standalone", "unknown"].map((segment) => {
    const segmentRows = rows.filter((row) => (row.audience_segment ?? "unknown") === segment);
    const paymentIds = new Set(segmentRows.map((row) => row.id));
    const segmentMessages = messages.filter((message) => paymentIds.has(message.failed_payment_id));
    const messageIds = new Set(segmentMessages.map((message) => message.id).filter(Boolean));
    const segmentEvents = events.filter((event) => messageIds.has(event.recovery_message_id ?? ""));
    const recoveredCount = segmentRows.filter((row) => row.status === "recovered").length;
    const engagement = buildEmailEngagementMetric(segmentEvents);
    const delivery = buildDeliveryHealthMetric(segmentMessages);
    const recoveryHours = segmentRows
      .map((row) => row.recovered_at ? hoursBetween(row.created_at, row.recovered_at) : null)
      .filter((value): value is number => value !== null);
    const averageHours = recoveryHours.length
      ? recoveryHours.reduce((total, value) => total + value, 0) / recoveryHours.length
      : null;
    return {
      amountDueOnRecoveredInvoices: formatCurrencyAmounts(aggregateCurrencyAmounts(
        segmentRows
          .filter((row) => row.status === "recovered")
          .map((row) => ({ amount: row.amount_due ?? 0, currency: row.currency ?? null })),
      )),
      averageRecoveryTime: formatRecoveryTime(averageHours),
      clickRate: engagement.clickRate,
      deliveryRate: delivery.deliveryRate,
      label: labels[segment],
      openCount: segmentRows.length - recoveredCount,
      openRate: engagement.openRate,
      recoveredCount,
      recoveryRate: percent(recoveredCount, segmentRows.length),
      sentCount: segmentMessages.filter((message) => message.status === "sent").length,
      totalCount: segmentRows.length,
    };
  });
}

const TERMINAL_CASE_STATUSES = new Set([
  "canceled_by_merchant",
  "exhausted",
  "no_longer_applicable",
  "recovered",
]);
const BASELINE_MINIMUM_CASES = 30;
const BASELINE_MINIMUM_MATURITY_PERCENT = 80;

function hasValidMonetaryEvidence(payment: FailedPaymentMetricRow) {
  return Number.isFinite(payment.amount_due) &&
    (payment.amount_due ?? -1) >= 0 &&
    /^[a-z]{3}$/i.test(payment.currency ?? "");
}

export function buildDataSufficiencyMetric(
  failedPayments: FailedPaymentMetricRow[],
  filter: InsightsFilter,
): DataSufficiencyMetric {
  const terminalCount = failedPayments.filter((payment) =>
    TERMINAL_CASE_STATUSES.has(payment.case_status ?? ""),
  ).length;
  const maturityPercent = percent(terminalCount, failedPayments.length);
  const validMonetaryCount = failedPayments.filter(hasValidMonetaryEvidence).length;
  const environmentCount = failedPayments.filter((payment) => filter.environment === "live"
    ? payment.livemode === true
    : filter.environment === "test"
      ? payment.livemode === false
      : false).length;
  const samplePassed = failedPayments.length >= BASELINE_MINIMUM_CASES;
  const maturityPassed = failedPayments.length > 0 &&
    maturityPercent >= BASELINE_MINIMUM_MATURITY_PERCENT;
  const monetaryPassed = failedPayments.length > 0 &&
    validMonetaryCount === failedPayments.length;
  const environmentPassed = failedPayments.length > 0 &&
    filter.environment !== "unconfirmed" &&
    environmentCount === failedPayments.length;
  const gates = [
    {
      detail: `A descriptive baseline requires at least ${BASELINE_MINIMUM_CASES} cases in the selected cohort.`,
      label: "Sample size",
      passed: samplePassed,
      value: `${failedPayments.length} of ${BASELINE_MINIMUM_CASES} cases`,
    },
    {
      detail: `${terminalCount} of ${failedPayments.length} cases have a recorded terminal outcome. The reporting threshold is ${BASELINE_MINIMUM_MATURITY_PERCENT}%.`,
      label: "Outcome maturity",
      passed: maturityPassed,
      value: failedPayments.length === 0 ? "Awaiting cases" : `${maturityPercent}% terminal`,
    },
    {
      detail: "Every case must have a non-negative failure-time amount and a three-letter currency code. Multiple currencies remain reported separately.",
      label: "Monetary evidence",
      passed: monetaryPassed,
      value: `${validMonetaryCount} of ${failedPayments.length} complete`,
    },
    {
      detail: filter.environment === "unconfirmed"
        ? "Unconfirmed records cannot support an environment-specific baseline."
        : `Every selected case must be explicitly recorded as ${filter.environment} evidence.`,
      label: "Environment certainty",
      passed: environmentPassed,
      value: environmentPassed
        ? `${filter.environment === "live" ? "Live" : "Test"} evidence confirmed`
        : "Environment evidence incomplete",
    },
  ];
  const eligible = gates.every((gate) => gate.passed);

  return {
    eligible,
    gates,
    summary: eligible
      ? `The selected cohort meets the current descriptive-baseline policy. ${filter.environment === "test" ? "It remains test evidence and cannot support live-performance claims." : "This does not establish causation or incremental revenue."}`
      : "Baseline reporting remains withheld until every gate passes. Existing operational metrics remain visible and unchanged.",
    title: eligible ? "Eligible for descriptive baseline" : "Not yet eligible for baseline",
  };
}

function describePeriod(period: InsightPeriod) {
  if (period === "all") {
    return "All recorded failure dates";
  }

  return `Failures first recorded in the last ${period.replace("d", " days")}`;
}

function describeSegment(segment: InsightSegment) {
  const labels: Record<InsightSegment, string> = {
    all: "all invoice audiences",
    standalone: "standalone invoices",
    subscription: "subscription renewals",
    unknown: "unknown invoice types",
  };

  return labels[segment];
}

export function buildMeasurementQualityMetric(
  failedPayments: FailedPaymentMetricRow[],
  filter: InsightsFilter,
): MeasurementQualityMetric {
  const liveCount = failedPayments.filter((payment) => payment.livemode === true).length;
  const testCount = failedPayments.filter((payment) => payment.livemode === false).length;
  const unknownEnvironmentCount = failedPayments.filter(
    (payment) => payment.livemode === null || payment.livemode === undefined,
  ).length;
  const terminalCount = failedPayments.filter((payment) =>
    TERMINAL_CASE_STATUSES.has(payment.case_status ?? ""),
  ).length;
  const unresolvedCount = failedPayments.length - terminalCount;
  const environmentValue = failedPayments.length === 0
    ? "No evidence selected"
    : liveCount > 0 && testCount > 0
      ? "Unexpected mixed evidence"
      : liveCount > 0
        ? "Live evidence only"
        : testCount > 0
          ? "Test evidence only"
          : "Environment unconfirmed";
  const environmentDetail = [
    `${liveCount} live`,
    `${testCount} test`,
    unknownEnvironmentCount > 0 ? `${unknownEnvironmentCount} unconfirmed` : null,
  ].filter(Boolean).join(" · ");

  return {
    items: [
      {
        detail: "The period applies to when each failed-payment case entered the cohort, not when messages or recoveries occurred.",
        label: "Cohort definition",
        status: "informational",
        value: `${describePeriod(filter.period)} · ${describeSegment(filter.segment)}`,
      },
      {
        detail: failedPayments.length === 0
          ? "No selected cases are available to assess outcome maturity."
          : unresolvedCount > 0
            ? `${terminalCount} terminal · ${unresolvedCount} non-terminal. Observed recovery rates may change as open cases progress.`
            : `${terminalCount} terminal · 0 non-terminal among the selected records.`,
        label: "Outcome maturity",
        status: unresolvedCount > 0 ? "attention" : "clear",
        value: failedPayments.length === 0
          ? "Awaiting cohort evidence"
          : unresolvedCount > 0
            ? "Outcomes still maturing"
            : "Recorded outcomes are terminal",
      },
      {
        detail: `${environmentDetail}. This view includes only the selected evidence environment; test evidence must not support live-performance claims.`,
        label: "Test / live boundary",
        status: liveCount > 0 && testCount > 0 || unknownEnvironmentCount > 0 ? "attention" : "clear",
        value: environmentValue,
      },
      {
        detail: "Audience amounts sum the invoice amount due at failure for cases later marked recovered; they are not confirmed collected or incremental revenue.",
        label: "Amount basis",
        status: "attention",
        value: "Failure-time amount due",
      },
      {
        detail: "No control group or counterfactual baseline is present. Email-step reporting is latest-prior-message association only.",
        label: "Evidence limitation",
        status: "informational",
        value: "Descriptive, not causal",
      },
    ],
    summary: "Read-only evidence context. No headline calculation, recovery state, message schedule, or delivery behavior is changed.",
    title: "Measurement quality",
  };
}

export function buildInsightsMetrics({
  events = [],
  failedPayments,
  filter = { environment: "unconfirmed", period: "30d", segment: "all" },
  messages,
  sequences,
}: {
  events?: RecoveryMessageEventMetricRow[];
  failedPayments: FailedPaymentMetricRow[];
  filter?: InsightsFilter;
  messages: RecoveryMessageMetricRow[];
  sequences: RecoverySequenceMetricRow[];
}): InsightsMetrics {
  const sentCount = messages.filter((message) => message.status === "sent").length;
  const pendingStatuses = new Set(["claimed", "paused", "pending", "scheduled"]);
  const failureStatuses = new Set(["failed", "failed_retryable", "failed_terminal"]);
  const pendingCount = messages.filter((message) => pendingStatuses.has(message.status)).length;
  const canceledCount = messages.filter((message) => message.status === "canceled").length;
  const failedMessageCount = messages.filter((message) => failureStatuses.has(message.status)).length;
  const recoveredCount = failedPayments.filter((payment) => payment.status === "recovered").length;
  const recoveryRate = percent(recoveredCount, failedPayments.length);
  const sentRate = percent(sentCount, messages.length);
  const mostSentEmail = getMostSentEmail(messages);
  const emailRecovery = buildEmailRecoveryMetrics(messages, failedPayments);
  const sequenceSummary = buildSequenceSummaryMetrics(sequences, failedPayments);
  const deliveryHealth = buildDeliveryHealthMetric(messages);
  const emailEngagement = buildEmailEngagementMetric(events);
  const segmentBreakdown = buildSegmentMetrics(failedPayments, messages, events);

  return {
    cards: [
      {
        icon: "mail",
        iconClass: "bg-[var(--primary-soft)] text-[var(--primary)]",
        rows: [
          {
            label: mostSentEmail.label,
            rowClass: "bg-[var(--success-soft)] border-[var(--success-badge)]",
            value: mostSentEmail.value,
            valueClass: "text-[var(--success)]",
          },
          {
            label: "Messages awaiting completion",
            rowClass: "bg-[var(--background)] border-[var(--border)]",
            value: String(pendingCount),
            valueClass: "text-[var(--muted-strong)]",
          },
        ],
        title: "Email Delivery",
      },
      {
        icon: "target",
        iconClass: "bg-[var(--success-soft)] text-[var(--success)]",
        rows: [
          {
            label: "Recovered payments",
            rowClass: "bg-[var(--blue-soft)] border-[var(--blue-border)]",
            value: `${recoveredCount} recovered`,
            valueClass: "text-[var(--success)]",
          },
          {
            label: "Most common Stripe event",
            rowClass: "bg-[var(--background)] border-[var(--border)]",
            value: getMostCommonFailure(failedPayments),
            valueClass: "text-[var(--muted-strong)]",
          },
        ],
        title: "Recovery Outcomes",
      },
    ],
    dataSufficiency: buildDataSufficiencyMetric(failedPayments, filter),
    deliveryHealth,
    emailEngagement,
    emailRecovery,
    funnel: [
      {
        barClass: `${getWidthClass(sentRate)} bg-[var(--primary)]`,
        label: "Messages sent",
        trackClass: "bg-[var(--primary-soft)]",
        value: messages.length === 0 ? "0 sent" : formatPercent(sentRate),
      },
      {
        barClass: `${getWidthClass(percent(pendingCount, messages.length))} bg-[var(--chart-blue)]`,
        label: "Messages awaiting completion",
        trackClass: "bg-[var(--blue-soft)]",
        value: String(pendingCount),
      },
      {
        barClass: `${getWidthClass(percent(canceledCount + failedMessageCount, messages.length))} bg-[var(--chart-green)]`,
        label: "Canceled or failed messages",
        trackClass: "bg-[var(--chart-green-track)]",
        value: String(canceledCount + failedMessageCount),
      },
      {
        barClass: `${getWidthClass(recoveryRate)} bg-[var(--chart-green-dark)]`,
        label: "Payments recovered",
        trackClass: "bg-[var(--chart-green-track)]",
        value: formatPercent(recoveryRate),
      },
    ],
    measurementQuality: buildMeasurementQualityMetric(failedPayments, filter),
    sequenceSummary,
    segmentBreakdown,
  };
}

export function normalizeInsightsFilter(input?: {
  environment?: string | string[];
  period?: string | string[];
  segment?: string | string[];
}, defaultEnvironment: InsightEnvironment = "unconfirmed"): InsightsFilter {
  const rawEnvironment = Array.isArray(input?.environment)
    ? input?.environment[0]
    : input?.environment;
  const rawPeriod = Array.isArray(input?.period) ? input?.period[0] : input?.period;
  const rawSegment = Array.isArray(input?.segment) ? input?.segment[0] : input?.segment;
  return {
    environment: INSIGHT_ENVIRONMENTS.includes(rawEnvironment as InsightEnvironment)
      ? rawEnvironment as InsightEnvironment
      : defaultEnvironment,
    period: INSIGHT_PERIODS.includes(rawPeriod as InsightPeriod) ? rawPeriod as InsightPeriod : "30d",
    segment: INSIGHT_SEGMENTS.includes(rawSegment as InsightSegment) ? rawSegment as InsightSegment : "all",
  };
}

export function filterInsightsRows({
  events,
  filter,
  failedPayments,
  messages,
  now = new Date(),
  sequences,
}: {
  events: RecoveryMessageEventMetricRow[];
  filter: InsightsFilter;
  failedPayments: FailedPaymentMetricRow[];
  messages: RecoveryMessageMetricRow[];
  now?: Date;
  sequences: RecoverySequenceMetricRow[];
}) {
  const cutoff = filter.period === "all"
    ? null
    : now.getTime() - Number.parseInt(filter.period, 10) * 24 * 60 * 60 * 1000;
  const selectedPayments = failedPayments.filter((payment) => {
    const inEnvironment = filter.environment === "live"
      ? payment.livemode === true
      : filter.environment === "test"
        ? payment.livemode === false
        : payment.livemode === null || payment.livemode === undefined;
    const inPeriod = cutoff === null || new Date(payment.created_at).getTime() >= cutoff;
    const inSegment = filter.segment === "all" || (payment.audience_segment ?? "unknown") === filter.segment;
    return inEnvironment && inPeriod && inSegment;
  });
  const paymentIds = new Set(selectedPayments.map((payment) => payment.id));
  const selectedMessages = messages.filter((message) => paymentIds.has(message.failed_payment_id));
  const messageIds = new Set(selectedMessages.map((message) => message.id).filter(Boolean));
  return {
    events: events.filter((event) => Boolean(event.recovery_message_id) && messageIds.has(event.recovery_message_id ?? "")),
    failedPayments: selectedPayments,
    messages: selectedMessages,
    sequences: sequences.filter((sequence) => Boolean(sequence.failed_payment_id) && paymentIds.has(sequence.failed_payment_id ?? "")),
  };
}

export async function getInsightsMetrics(
  userId: string,
  filter: InsightsFilter = { environment: "unconfirmed", period: "30d", segment: "all" },
): Promise<InsightsMetrics> {
  const [messages, events, failedPayments, sequences] = await Promise.all([
    getRecoveryMessageRows(userId),
    getRecoveryMessageEventRows(userId),
    getFailedPaymentRows(userId),
    getRecoverySequenceRows(userId),
  ]);

  return buildInsightsMetrics({
    ...filterInsightsRows({ events, failedPayments, filter, messages, sequences }),
    filter,
  });
}
