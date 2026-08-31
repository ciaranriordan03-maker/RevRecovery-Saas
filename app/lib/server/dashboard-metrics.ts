import "server-only";

import {
  aggregateCurrencyAmounts,
  formatCurrencyAmounts,
  type CurrencyAmount,
} from "../currency";
import { createSupabaseAdminClient } from "../supabase/admin";

export type DashboardMetricCard = {
  caption: string;
  label: string;
  tone: "risk" | "success";
  value: string;
};

export type DashboardMetrics = {
  atRiskCustomersCount: number;
  failedPaymentsCount: number;
  metricCards: DashboardMetricCard[];
  recoveredRevenueByCurrency: CurrencyAmount[];
  recoveryRate: number;
  revenueAtRiskByCurrency: CurrencyAmount[];
};

type FailedPaymentMetricRow = {
  amount_due: number;
  currency: string | null;
  status: string;
  stripe_customer_id: string | null;
};

type RecoveryMessageMetricRow = {
  status: string;
};

const FAILED_PAYMENTS_TABLE = "failed_payments";
const RECOVERY_MESSAGES_TABLE = "recovery_messages";

function isRecovered(row: FailedPaymentMetricRow) {
  return row.status === "recovered";
}

function isRevenueAtRisk(row: FailedPaymentMetricRow) {
  return !["recovered", "no_longer_applicable", "canceled_by_merchant"].includes(
    row.status,
  );
}

function buildEmptyMetrics(): DashboardMetrics {
  return {
    atRiskCustomersCount: 0,
    failedPaymentsCount: 0,
    metricCards: [
      {
        caption: "No open failed payments",
        label: "Revenue at Risk",
        tone: "risk",
        value: "$0",
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
        value: "$0",
      },
    ],
    recoveredRevenueByCurrency: [],
    recoveryRate: 0,
    revenueAtRiskByCurrency: [],
  };
}

async function getFailedPaymentRows(userId: string) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from(FAILED_PAYMENTS_TABLE)
    .select("amount_due, currency, status, stripe_customer_id")
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
    .select("status")
    .eq("user_id", userId)
    .returns<RecoveryMessageMetricRow[]>();

  if (error) {
    throw new Error(`Unable to load dashboard recovery message metrics: ${error.message}`);
  }

  return data ?? [];
}

export async function getDashboardMetrics(userId: string): Promise<DashboardMetrics> {
  const [failedPaymentRows, recoveryMessageRows] = await Promise.all([
    getFailedPaymentRows(userId),
    getRecoveryMessageRows(userId),
  ]);

  return buildDashboardMetrics(failedPaymentRows, recoveryMessageRows);
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
    recoveredRevenueByCurrency,
    recoveryRate,
    revenueAtRiskByCurrency,
  };
}
