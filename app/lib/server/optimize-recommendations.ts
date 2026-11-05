import "server-only";

import { aggregateCurrencyAmounts, formatCurrencyAmounts } from "../currency";
import { createSupabaseAdminClient } from "../supabase/admin";
import { isOpenRecoveryCase } from "../stripe/recovery-state";
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
  environmentLabel: string;
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
  case_status?: string | null;
  currency: string | null;
  id: string;
  livemode: boolean | null;
  recovery_stage: string;
  status: string;
  stripe_customer_id: string | null;
};

type RecoveryMessageOptimizationRow = {
  failed_payment_id: string;
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
  return isOpenRecoveryCase(row.case_status, row.status);
}

async function getFailedPaymentRows(userId: string) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from(FAILED_PAYMENTS_TABLE)
    .select(
      "id, amount_due, currency, recovery_stage, status, case_status, stripe_customer_id, livemode",
    )
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
    .select("failed_payment_id, message_key, status, step_number")
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
  casesHref: string,
) {
  const recommendations = [buildModeRecommendation(recoverySettings)];

  if (openFailedPaymentCount > 0) {
    recommendations.push({
      actionHref: casesHref,
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

function getOptimizeEnvironmentScope(
  recoverySettings: OptimizeRecoveryContext,
) {
  if (recoverySettings.connected && recoverySettings.livemode === true) {
    return {
      casesHref: "/dashboard/cases?environment=live",
      label: "Live Stripe data",
      livemode: true,
    } as const;
  }

  if (recoverySettings.connected && recoverySettings.livemode === false) {
    return {
      casesHref: "/dashboard/cases?environment=test",
      label: "Test Stripe data",
      livemode: false,
    } as const;
  }

  return {
    casesHref: "/dashboard/cases",
    label: "All recorded Stripe environments",
    livemode: null,
  } as const;
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
  const environment = getOptimizeEnvironmentScope(recoverySettings);
  const scopedFailedPayments = environment.livemode === null
    ? failedPayments
    : failedPayments.filter(
        (payment) => payment.livemode === environment.livemode,
      );
  const scopedFailedPaymentIds = new Set(
    scopedFailedPayments.map((payment) => payment.id),
  );
  const scopedRecoveryMessages = recoveryMessages.filter((message) =>
    scopedFailedPaymentIds.has(message.failed_payment_id),
  );
  const openFailedPayments = scopedFailedPayments.filter(isOpenFailedPayment);
  const openRevenueAtRisk = aggregateCurrencyAmounts(
    openFailedPayments.map((payment) => ({
      amount: payment.amount_due,
      currency: payment.currency,
    })),
  );
  const recommendations = buildRecommendations(
    openFailedPayments.length,
    recoverySettings,
    environment.casesHref,
  );

  return {
    environmentLabel: environment.label,
    impactSummary: {
      caption: openFailedPayments.length > 0
        ? `Across ${openFailedPayments.length} open failed payment${openFailedPayments.length === 1 ? "" : "s"} · ${environment.label}`
        : `Waiting for failed payment data · ${environment.label}`,
      value: formatCurrencyAmounts(openRevenueAtRisk),
    },
    intro: {
      count: recommendations.length,
      summary: openFailedPayments.length > 0
        ? `This environment currently has ${openFailedPayments.length} open failed payment${openFailedPayments.length === 1 ? "" : "s"} and ${scopedRecoveryMessages.length} recovery message${scopedRecoveryMessages.length === 1 ? "" : "s"} in its history.`
        : "Guidance is based on your current Stripe connection and recovery delivery mode.",
    },
    recommendations,
  };
}
