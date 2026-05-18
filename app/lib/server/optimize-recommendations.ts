import "server-only";

import { createSupabaseAdminClient } from "../supabase/admin";

export type OptimizeRecommendation = {
  action: string;
  body: string;
  impactBadgeClass?: string;
  impactLabel?: string;
  title: string;
  titleBadgeClass: string;
};

export type OptimizeRecommendations = {
  impactSummary: {
    caption: string;
    value: string;
  };
  intro: {
    count: number;
    summary: string;
  };
  recommendations: OptimizeRecommendation[];
};

type FailedPaymentOptimizationRow = {
  amount_due: number;
  currency: string | null;
  recovery_stage: string;
  status: string;
  stripe_customer_id: string | null;
};

type RecoveryMessageOptimizationRow = {
  message_key: string;
  status: string;
  step_number: number;
};

const FAILED_PAYMENTS_TABLE = "failed_payments";
const RECOVERY_MESSAGES_TABLE = "recovery_messages";

const BADGE_CLASSES = {
  amber: "bg-[var(--warning-soft)] text-[var(--warning-text)]",
  green: "bg-[var(--success-soft)] text-[var(--success-badge-text)]",
  purple: "bg-[var(--primary-soft)] text-[var(--primary-text)]",
} as const;

const HIGH_VALUE_CUSTOMER_RECOMMENDATION: OptimizeRecommendation = {
  action: "Create VIP Segment",
  body: "Customers on higher-value plans may respond better to personalized recovery messaging and faster follow-up timing.",
  impactBadgeClass: BADGE_CLASSES.green,
  impactLabel: "Revenue Impact",
  title: "Segment High-Value Customers",
  titleBadgeClass: BADGE_CLASSES.green,
};

function formatCurrency(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
    style: "currency",
  }).format(cents / 100);
}

function getPrimaryCurrency(rows: FailedPaymentOptimizationRow[]) {
  return rows.find((row) => row.currency)?.currency ?? "usd";
}

function isOpenFailedPayment(row: FailedPaymentOptimizationRow) {
  return row.status !== "recovered";
}

function estimatePotentialRecovery(openRevenueAtRisk: number, sentMessagesCount: number) {
  if (openRevenueAtRisk <= 0) {
    return 0;
  }

  const recoveryMultiplier = sentMessagesCount > 0 ? 0.12 : 0.08;
  return Math.round(openRevenueAtRisk * recoveryMultiplier);
}

async function getFailedPaymentRows(userId: string) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from(FAILED_PAYMENTS_TABLE)
    .select("amount_due, currency, recovery_stage, status, stripe_customer_id")
    .eq("user_id", userId)
    .returns<FailedPaymentOptimizationRow[]>();

  if (error) {
    throw new Error(`Unable to load optimize failed payments: ${error.message}`);
  }

  return data ?? [];
}

async function getRecoveryMessageRows(userId: string) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from(RECOVERY_MESSAGES_TABLE)
    .select("message_key, status, step_number")
    .eq("user_id", userId)
    .returns<RecoveryMessageOptimizationRow[]>();

  if (error) {
    throw new Error(`Unable to load optimize recovery messages: ${error.message}`);
  }

  return data ?? [];
}

function buildRecommendations({
  pendingMessagesCount,
  sentMessagesCount,
}: {
  pendingMessagesCount: number;
  sentMessagesCount: number;
}) {
  const recommendations: OptimizeRecommendation[] = [
    HIGH_VALUE_CUSTOMER_RECOMMENDATION,
  ];

  if (pendingMessagesCount > 0) {
    recommendations.push({
      action: "Review Timing",
      body: `${pendingMessagesCount} recovery emails are queued. Review send timing so customers get the first reminder while the failed payment is still fresh.`,
      title: "Tune pending email timing",
      titleBadgeClass: BADGE_CLASSES.purple,
    });
  } else {
    recommendations.push({
      action: "Add Reminder",
      body: "No recovery emails are currently queued. Keep Email 1 immediate so every new failed payment gets a fast customer reminder.",
      title: "Keep first outreach immediate",
      titleBadgeClass: BADGE_CLASSES.purple,
    });
  }

  recommendations.push({
    action: "Apply Change",
    body: "Add a short explanation of common decline reasons so customers know whether to update a card, check funds, or contact their bank.",
    title: 'Add a "Why this happened" section',
    titleBadgeClass: BADGE_CLASSES.amber,
  });

  if (sentMessagesCount > 0) {
    recommendations.push({
      action: "Apply Change",
      body: `${sentMessagesCount} recovery emails have been sent. Add a clearer deadline to later reminders so unresolved customers know when access may be affected.`,
      title: "Add urgency to Email 3",
      titleBadgeClass: BADGE_CLASSES.amber,
    });
  }

  return recommendations.slice(0, 3);
}

export async function getOptimizeRecommendations(
  userId: string,
): Promise<OptimizeRecommendations> {
  const [failedPayments, recoveryMessages] = await Promise.all([
    getFailedPaymentRows(userId),
    getRecoveryMessageRows(userId),
  ]);

  const openFailedPayments = failedPayments.filter(isOpenFailedPayment);
  const currency = getPrimaryCurrency(failedPayments);
  const openRevenueAtRisk = openFailedPayments.reduce(
    (total, payment) => total + payment.amount_due,
    0,
  );
  const sentMessagesCount = recoveryMessages.filter(
    (message) => message.status === "sent",
  ).length;
  const pendingMessagesCount = recoveryMessages.filter(
    (message) => message.status === "pending",
  ).length;
  const potentialRecovery = estimatePotentialRecovery(
    openRevenueAtRisk,
    sentMessagesCount,
  );
  const recommendations = buildRecommendations({
    pendingMessagesCount,
    sentMessagesCount,
  });

  return {
    impactSummary: {
      caption: openRevenueAtRisk > 0
        ? `Estimated from ${formatCurrency(openRevenueAtRisk, currency)} currently at risk`
        : "Waiting for failed payment data",
      value: formatCurrency(potentialRecovery, currency),
    },
    intro: {
      count: recommendations.length,
      summary: openFailedPayments.length > 0
        ? `Based on ${openFailedPayments.length} open failed payments and ${recoveryMessages.length} recovery emails.`
        : "Recommendations will sharpen as failed payments and recovery emails come in.",
    },
    recommendations,
  };
}
