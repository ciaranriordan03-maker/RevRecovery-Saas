import "server-only";

import { aggregateCurrencyAmounts, formatCurrencyAmounts } from "../currency";
import { createSupabaseAdminClient } from "../supabase/admin";
import {
  getRecoveryModeSettingsForUser,
  type RecoveryModeSettings,
} from "./recovery-account-settings";

export type OptimizeRecommendation = {
  actionHref: string;
  actionLabel: string;
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

type OptimizeRecoveryContext = Pick<
  RecoveryModeSettings,
  "approvedTestRecipient" | "connected" | "livemode" | "mode"
>;

const DEFAULT_RECOVERY_CONTEXT: OptimizeRecoveryContext = {
  approvedTestRecipient: null,
  connected: false,
  livemode: null,
  mode: "off",
};

function isOpenFailedPayment(row: FailedPaymentOptimizationRow) {
  return !["recovered", "no_longer_applicable", "canceled_by_merchant"].includes(
    row.status,
  );
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

function buildModeRecommendation(
  recoverySettings: OptimizeRecoveryContext,
): OptimizeRecommendation {
  if (!recoverySettings.connected) {
    return {
      actionHref: "/dashboard/settings",
      actionLabel: "Connect Stripe",
      body: "Connect a Stripe account before RevRecovery can monitor failed payments or run a recovery flow.",
      title: "Finish connecting Stripe",
      titleBadgeClass: BADGE_CLASSES.amber,
    };
  }

  if (recoverySettings.mode === "test") {
    return {
      actionHref: "/dashboard/recovery?step=customize",
      actionLabel: "Review test settings",
      body: recoverySettings.approvedTestRecipient
        ? `Recovery emails are currently restricted to ${recoverySettings.approvedTestRecipient}. Review the flow before switching to live delivery.`
        : "Test mode is selected, but an approved test recipient is still required before emails can be delivered.",
      title: "Validate your test recovery flow",
      titleBadgeClass: BADGE_CLASSES.purple,
    };
  }

  if (recoverySettings.mode === "live") {
    return {
      actionHref: "/dashboard/recovery?step=review",
      actionLabel: "Review recovery flow",
      body: `Recovery is live for ${recoverySettings.livemode ? "live Stripe data" : "Stripe sandbox data"}. Review the active schedule and customer-facing messages whenever your process changes.`,
      title: "Keep your live recovery flow current",
      titleBadgeClass: BADGE_CLASSES.green,
    };
  }

  if (recoverySettings.mode === "paused") {
    return {
      actionHref: "/dashboard/recovery?step=customize",
      actionLabel: "Review delivery settings",
      body: "Your recovery setup and queued work are preserved, but no recovery emails are sent while delivery is paused.",
      title: "Recovery delivery is paused",
      titleBadgeClass: BADGE_CLASSES.amber,
    };
  }

  return {
    actionHref: "/dashboard/recovery?step=customize",
    actionLabel: "Review delivery settings",
    body: "Failed payments can be recorded, but recovery emails are not scheduled while recovery is off.",
    title: "Turn on recovery when you are ready",
    titleBadgeClass: BADGE_CLASSES.amber,
  };
}

function buildRecommendations(
  openFailedPaymentCount: number,
  recoverySettings: OptimizeRecoveryContext,
) {
  const recommendations = [buildModeRecommendation(recoverySettings)];

  if (openFailedPaymentCount > 0) {
    recommendations.push({
      actionHref: "/dashboard/recovery",
      actionLabel: "View active cases",
      body: `${openFailedPaymentCount} failed payment${openFailedPaymentCount === 1 ? " is" : "s are"} currently open. Review the cases and their next scheduled action.`,
      impactBadgeClass: BADGE_CLASSES.green,
      impactLabel: "Revenue at risk",
      title: "Review active recovery cases",
      titleBadgeClass: BADGE_CLASSES.green,
    });
  }

  return recommendations;
}

export async function getOptimizeRecommendations(
  userId: string,
): Promise<OptimizeRecommendations> {
  const [failedPayments, recoveryMessages, recoverySettings] = await Promise.all([
    getFailedPaymentRows(userId),
    getRecoveryMessageRows(userId),
    getRecoveryModeSettingsForUser(userId),
  ]);

  return buildOptimizeRecommendations(
    failedPayments,
    recoveryMessages,
    recoverySettings,
  );
}

export function buildOptimizeRecommendations(
  failedPayments: FailedPaymentOptimizationRow[],
  recoveryMessages: RecoveryMessageOptimizationRow[],
  recoverySettings: OptimizeRecoveryContext = DEFAULT_RECOVERY_CONTEXT,
): OptimizeRecommendations {
  const openFailedPayments = failedPayments.filter(isOpenFailedPayment);
  const openRevenueAtRisk = aggregateCurrencyAmounts(
    openFailedPayments.map((payment) => ({
      amount: payment.amount_due,
      currency: payment.currency,
    })),
  );
  const recommendations = buildRecommendations(
    openFailedPayments.length,
    recoverySettings,
  );

  return {
    impactSummary: {
      caption: openFailedPayments.length > 0
        ? `Across ${openFailedPayments.length} open failed payment${openFailedPayments.length === 1 ? "" : "s"}`
        : "Waiting for failed payment data",
      value: formatCurrencyAmounts(openRevenueAtRisk),
    },
    intro: {
      count: recommendations.length,
      summary: openFailedPayments.length > 0
        ? `Your account currently has ${openFailedPayments.length} open failed payment${openFailedPayments.length === 1 ? "" : "s"} and ${recoveryMessages.length} recovery message${recoveryMessages.length === 1 ? "" : "s"} in its history.`
        : "Guidance is based on your current Stripe connection and recovery delivery mode.",
    },
    recommendations,
  };
}
