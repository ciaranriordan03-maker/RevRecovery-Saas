import "server-only";

import { createSupabaseAdminClient } from "../supabase/admin";

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
  deliveryHealth: DeliveryHealthMetric;
  emailEngagement: EmailEngagementMetric;
  emailRecovery: EmailRecoveryMetric[];
  funnel: InsightFunnelMetric[];
  sequenceSummary: SequenceSummaryMetric[];
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

export type DeliveryHealthMetric = {
  deliveryRate: number | null;
  rows: {
    label: string;
    value: number;
  }[];
  terminalOutcomeCount: number;
};

export type RecoveryMessageMetricRow = {
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
  created_at: string;
  id: string;
  last_event_type: string;
  recovered_at: string | null;
  status: string;
};

export type RecoverySequenceMetricRow = {
  completed_at: string | null;
  id: string;
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
      "failed_payment_id, message_key, provider_delivery_occurred_at, provider_delivery_status, sequence_id, sent_at, step_number, status",
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
    .select("created_at, id, last_event_type, recovered_at, status")
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
    .select("completed_at, id, started_at, status")
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

export function buildInsightsMetrics({
  events = [],
  failedPayments,
  messages,
  sequences,
}: {
  events?: RecoveryMessageEventMetricRow[];
  failedPayments: FailedPaymentMetricRow[];
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
    sequenceSummary,
  };
}

export async function getInsightsMetrics(userId: string): Promise<InsightsMetrics> {
  const [messages, events, failedPayments, sequences] = await Promise.all([
    getRecoveryMessageRows(userId),
    getRecoveryMessageEventRows(userId),
    getFailedPaymentRows(userId),
    getRecoverySequenceRows(userId),
  ]);

  return buildInsightsMetrics({ events, failedPayments, messages, sequences });
}
