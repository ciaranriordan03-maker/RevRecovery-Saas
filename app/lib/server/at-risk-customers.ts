import "server-only";

import { createSupabaseAdminClient } from "../supabase/admin";

export type AtRiskCustomer = {
  amountDue: number;
  currency: string | null;
  customerEmail: string | null;
  customerId: string | null;
  failedPaymentId: string;
  invoiceId: string;
  invoiceStatus: string;
  nextEmailAt: string | null;
  nextEmailKey: string | null;
  recoveryStage: string;
  sequenceStatus: string | null;
  status: string;
  updatedAt: string;
};

type FailedPaymentRow = {
  amount_due: number;
  currency: string | null;
  id: string;
  latest_payload: Record<string, unknown>;
  recovery_stage: string;
  status: string;
  stripe_customer_id: string | null;
  stripe_invoice_id: string;
  updated_at: string;
};

type RecoverySequenceRow = {
  failed_payment_id: string;
  status: string;
};

type RecoveryMessageRow = {
  failed_payment_id: string;
  message_key: string;
  scheduled_for: string;
  status: string;
};

const FAILED_PAYMENTS_TABLE = "failed_payments";
const RECOVERY_MESSAGES_TABLE = "recovery_messages";
const RECOVERY_SEQUENCES_TABLE = "recovery_sequences";

function getCustomerEmail(payload: Record<string, unknown>) {
  return typeof payload.customer_email === "string" && payload.customer_email.trim()
    ? payload.customer_email
    : null;
}

function getInvoiceStatus(row: FailedPaymentRow) {
  const payloadStatus = row.latest_payload.status;

  if (typeof payloadStatus === "string" && payloadStatus.trim()) {
    return payloadStatus;
  }

  return row.status;
}

async function getFailedPaymentRows(userId: string) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from(FAILED_PAYMENTS_TABLE)
    .select(
      "id, stripe_customer_id, stripe_invoice_id, amount_due, currency, status, recovery_stage, latest_payload, updated_at",
    )
    .eq("user_id", userId)
    .neq("status", "recovered")
    .order("updated_at", { ascending: false })
    .returns<FailedPaymentRow[]>();

  if (error) {
    throw new Error(`Unable to load at-risk customers: ${error.message}`);
  }

  return data ?? [];
}

async function getRecoverySequences(failedPaymentIds: string[]) {
  if (failedPaymentIds.length === 0) {
    return [];
  }

  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from(RECOVERY_SEQUENCES_TABLE)
    .select("failed_payment_id, status")
    .in("failed_payment_id", failedPaymentIds)
    .returns<RecoverySequenceRow[]>();

  if (error) {
    throw new Error(`Unable to load recovery sequences: ${error.message}`);
  }

  return data ?? [];
}

async function getPendingRecoveryMessages(failedPaymentIds: string[]) {
  if (failedPaymentIds.length === 0) {
    return [];
  }

  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from(RECOVERY_MESSAGES_TABLE)
    .select("failed_payment_id, message_key, scheduled_for, status")
    .in("failed_payment_id", failedPaymentIds)
    .eq("status", "pending")
    .order("scheduled_for", { ascending: true })
    .returns<RecoveryMessageRow[]>();

  if (error) {
    throw new Error(`Unable to load pending recovery messages: ${error.message}`);
  }

  return data ?? [];
}

export async function getAtRiskCustomers(userId: string): Promise<AtRiskCustomer[]> {
  const failedPayments = await getFailedPaymentRows(userId);
  const failedPaymentIds = failedPayments.map((payment) => payment.id);
  const [sequences, pendingMessages] = await Promise.all([
    getRecoverySequences(failedPaymentIds),
    getPendingRecoveryMessages(failedPaymentIds),
  ]);
  const sequencesByFailedPaymentId = new Map(
    sequences.map((sequence) => [sequence.failed_payment_id, sequence]),
  );
  const nextMessageByFailedPaymentId = new Map<string, RecoveryMessageRow>();

  for (const message of pendingMessages) {
    if (!nextMessageByFailedPaymentId.has(message.failed_payment_id)) {
      nextMessageByFailedPaymentId.set(message.failed_payment_id, message);
    }
  }

  return failedPayments.map((payment) => {
    const sequence = sequencesByFailedPaymentId.get(payment.id);
    const nextMessage = nextMessageByFailedPaymentId.get(payment.id);

    return {
      amountDue: payment.amount_due,
      currency: payment.currency,
      customerEmail: getCustomerEmail(payment.latest_payload),
      customerId: payment.stripe_customer_id,
      failedPaymentId: payment.id,
      invoiceId: payment.stripe_invoice_id,
      invoiceStatus: getInvoiceStatus(payment),
      nextEmailAt: nextMessage?.scheduled_for ?? null,
      nextEmailKey: nextMessage?.message_key ?? null,
      recoveryStage: payment.recovery_stage,
      sequenceStatus: sequence?.status ?? null,
      status: payment.status,
      updatedAt: payment.updated_at,
    };
  });
}
