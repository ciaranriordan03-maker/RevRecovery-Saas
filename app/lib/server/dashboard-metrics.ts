import "server-only";

import {
  aggregateCurrencyAmounts,
  formatCurrencyAmounts,
  type CurrencyAmount,
} from "../currency";
import { createSupabaseAdminClient } from "../supabase/admin";
import {
  getEffectiveRecoveryCaseStatus,
  isOpenRecoveryCase,
} from "../stripe/recovery-state";

export type DashboardMetricCard = {
  caption: string;
  label: string;
  tone: "risk" | "success";
  value: string;
};

export type DashboardMetrics = {
  atRiskCustomersCount: number;
  eligiblePaymentsCount: number;
  failedPaymentsCount: number;
  metricCards: DashboardMetricCard[];
  recoveredPaymentsCount: number;
  recoveredRevenueByCurrency: CurrencyAmount[];
  recoveryRate: number;
  revenueAtRiskByCurrency: CurrencyAmount[];
  sentMessagesCount: number;
};

type FailedPaymentMetricRow = {
  amount_due: number;
  case_status?: string | null;
  currency: string | null;
  id?: string;
  livemode?: boolean | null;
  status: string;
  stripe_customer_id: string | null;
};

type RecoveryMessageMetricRow = {
  failed_payment_id?: string;
  status: string;
};

export type DashboardEnvironment = "all" | "live" | "test";

const FAILED_PAYMENTS_TABLE = "failed_payments";
const RECOVERY_MESSAGES_TABLE = "recovery_messages";

function isRecovered(row: FailedPaymentMetricRow) {
  return getEffectiveRecoveryCaseStatus(row.case_status, row.status) === "recovered";
}

function isRevenueAtRisk(row: FailedPaymentMetricRow) {
  return isOpenRecoveryCase(row.case_status, row.status);
}

function buildEmptyMetrics(): DashboardMetrics {
  return {
    atRiskCustomersCount: 0,
    eligiblePaymentsCount: 0,
    failedPaymentsCount: 0,
    metricCards: [
      {
        caption: "No open failed payments",
        label: "Revenue at Risk",
        tone: "risk",
        value: formatCurrencyAmounts([]),
      },
      {
        caption: "Across 0 customers",
        label: "Failed Payments",
        tone: "risk",
        value: "0",
      },
      {
        caption: "0% recovery rate",
        label: "Recovered Revenue",
        tone: "success",
        value: formatCurrencyAmounts([]),
      },
    ],
    recoveredPaymentsCount: 0,
    recoveredRevenueByCurrency: [],
    recoveryRate: 0,
    revenueAtRiskByCurrency: [],
    sentMessagesCount: 0,
  };
}

async function getFailedPaymentRows(userId: string) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from(FAILED_PAYMENTS_TABLE)
    .select("id, amount_due, currency, status, case_status, stripe_customer_id, livemode")
    .eq("user_id", userId)
    .returns<FailedPaymentMetricRow[]>();

  if (error) {
    throw new Error(`Unable to load dashboard failed payment metrics: ${error.message}`);
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
    .select("failed_payment_id, status")
    .eq("user_id", userId)
    .returns<RecoveryMessageMetricRow[]>();

  if (error) {
    throw new Error(`Unable to load dashboard recovery message metrics: ${error.message}`);
  }

  return data ?? [];
}

export async function getDashboardMetrics(
  userId: string,
  environment: DashboardEnvironment = "all",
): Promise<DashboardMetrics> {
  const [failedPaymentRows, recoveryMessageRows] = await Promise.all([
    getFailedPaymentRows(userId),
    getRecoveryMessageRows(userId),
  ]);

  const scopedFailedPaymentRows = environment === "all"
    ? failedPaymentRows
    : failedPaymentRows.filter((row) =>
      environment === "live" ? row.livemode === true : row.livemode === false,
    );
  const scopedPaymentIds = new Set(
    scopedFailedPaymentRows
      .map((row) => row.id)
      .filter((id): id is string => Boolean(id)),
  );
  const scopedRecoveryMessageRows = environment === "all"
    ? recoveryMessageRows
    : recoveryMessageRows.filter((row) =>
      Boolean(row.failed_payment_id && scopedPaymentIds.has(row.failed_payment_id)),
    );

  return buildDashboardMetrics(scopedFailedPaymentRows, scopedRecoveryMessageRows);
}

export function buildDashboardMetrics(
  failedPaymentRows: FailedPaymentMetricRow[],
  recoveryMessageRows: RecoveryMessageMetricRow[],
): DashboardMetrics {
  if (failedPaymentRows.length === 0) return buildEmptyMetrics();

  const openFailedPayments = failedPaymentRows.filter(isRevenueAtRisk);
  const recoveredPayments = failedPaymentRows.filter(isRecovered);
  const atRiskCustomers = new Set(
    openFailedPayments
      .map((row) => row.stripe_customer_id)
      .filter((customerId): customerId is string => Boolean(customerId)),
  );

  const revenueAtRiskByCurrency = aggregateCurrencyAmounts(
    openFailedPayments.map((row) => ({ amount: row.amount_due, currency: row.currency })),
  );
  const recoveredRevenueByCurrency = aggregateCurrencyAmounts(
    recoveredPayments.map((row) => ({ amount: row.amount_due, currency: row.currency })),
  );
  const eligiblePaymentsCount = openFailedPayments.length + recoveredPayments.length;
  const recoveryRate = eligiblePaymentsCount > 0
    ? Math.round((recoveredPayments.length / eligiblePaymentsCount) * 100)
    : 0;
  const sentMessagesCount = recoveryMessageRows.filter(
    (row) => row.status === "sent",
  ).length;

  return {
    atRiskCustomersCount: atRiskCustomers.size,
    eligiblePaymentsCount,
    failedPaymentsCount: openFailedPayments.length,
    metricCards: [
      {
        caption: `${openFailedPayments.length} open failed payments`,
        label: "Revenue at Risk",
        tone: "risk",
        value: formatCurrencyAmounts(revenueAtRiskByCurrency),
      },
      {
        caption: `Across ${atRiskCustomers.size} customers`,
        label: "Failed Payments",
        tone: "risk",
        value: String(openFailedPayments.length),
      },
      {
        caption: `${recoveryRate}% recovery rate · ${sentMessagesCount} emails sent`,
        label: "Recovered Revenue",
        tone: "success",
        value: formatCurrencyAmounts(recoveredRevenueByCurrency),
      },
    ],
    recoveredPaymentsCount: recoveredPayments.length,
    recoveredRevenueByCurrency,
    recoveryRate,
    revenueAtRiskByCurrency,
    sentMessagesCount,
  };
}
