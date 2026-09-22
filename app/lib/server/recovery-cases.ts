import "server-only";

import { getRecoveryDeclineDiagnostic } from "../recovery/decline-diagnostics";
import {
  getHighestRecoveryAttentionLevel,
  getRecoveryAttentionFlags,
  type RecoveryAttentionFlag,
  type RecoveryAttentionLevel,
} from "../recovery/attention-rules";
import { createSupabaseAdminClient } from "../supabase/admin";
import { getEffectiveRecoveryCaseStatus } from "../stripe/recovery-state";

export const RECOVERY_CASE_STATUS_FILTERS = [
  "all",
  "open",
  "recovered",
  "exhausted",
  "failed_operationally",
] as const;
export const RECOVERY_CASE_SEGMENT_FILTERS = [
  "all",
  "subscription",
  "standalone",
  "unknown",
] as const;
export const RECOVERY_CASE_ENVIRONMENT_FILTERS = [
  "all",
  "live",
  "test",
  "unknown",
] as const;

export type RecoveryCaseStatusFilter =
  (typeof RECOVERY_CASE_STATUS_FILTERS)[number];
export type RecoveryCaseSegmentFilter =
  (typeof RECOVERY_CASE_SEGMENT_FILTERS)[number];
export type RecoveryCaseEnvironmentFilter =
  (typeof RECOVERY_CASE_ENVIRONMENT_FILTERS)[number];
export type RecoveryCaseAudienceSegment = Exclude<
  RecoveryCaseSegmentFilter,
  "all"
>;

export type RecoveryCaseFilters = {
  environment: RecoveryCaseEnvironmentFilter;
  page: number;
  segment: RecoveryCaseSegmentFilter;
  status: RecoveryCaseStatusFilter;
};

export type RecoveryCaseListItem = {
  amountDue: number;
  attentionFlags: RecoveryAttentionFlag[];
  attentionLevel: RecoveryAttentionLevel | null;
  attemptCount: number;
  audienceSegment: RecoveryCaseAudienceSegment;
  caseStatus: string;
  createdAt: string;
  currency: string | null;
  customerEmail: string | null;
  customerId: string | null;
  failureExplanation: string;
  failureTitle: string;
  id: string;
  invoiceId: string;
  invoiceStatus: string | null;
  livemode: boolean | null;
  nextEmailAt: string | null;
  nextPaymentAttemptAt: string | null;
  recoveredAt: string | null;
  recoveryStage: string;
  updatedAt: string;
};

export type RecoveryCasesPage = {
  cases: RecoveryCaseListItem[];
  filters: RecoveryCaseFilters;
  pageCount: number;
  pageSize: number;
  totalCount: number;
};

type FailedPaymentRow = {
  amount_due: number;
  attempt_count: number;
  audience_segment: string | null;
  case_status: string | null;
  created_at: string;
  currency: string | null;
  decline_code: string | null;
  failure_code: string | null;
  failure_message: string | null;
  id: string;
  invoice_status: string | null;
  latest_payload: Record<string, unknown>;
  livemode: boolean | null;
  next_payment_attempt_at: string | null;
  recovered_at: string | null;
  recovery_stage: string;
  status: string;
  stripe_customer_id: string | null;
  stripe_invoice_id: string;
  updated_at: string;
};

type RecoveryMessageRow = {
  failed_payment_id: string;
  provider_delivery_status: string | null;
  scheduled_for: string;
  status: string;
};

type RecoveryCaseMessageFacts = {
  nextMessageByCase: Map<string, string>;
  providerDeliveryStatusesByCase: Map<string, string[]>;
};

const FAILED_PAYMENTS_TABLE = "failed_payments";
const RECOVERY_MESSAGES_TABLE = "recovery_messages";
const PAGE_SIZE = 50;
const RECOVERY_CASE_SELECT =
  "id, stripe_customer_id, stripe_invoice_id, amount_due, currency, status, case_status, recovery_stage, attempt_count, next_payment_attempt_at, invoice_status, failure_code, decline_code, failure_message, audience_segment, livemode, recovered_at, latest_payload, created_at, updated_at";
const OPEN_CASE_STATUSES = [
  "detected",
  "active",
  "awaiting_retry",
  "payment_method_updated",
  "exhausted",
  "failed_operationally",
];

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getEnumValue<T extends readonly string[]>(
  values: T,
  value: string | undefined,
  fallback: T[number],
): T[number] {
  return values.includes(value as T[number]) ? (value as T[number]) : fallback;
}

export function normalizeRecoveryCaseFilters(input?: {
  environment?: string | string[];
  page?: string | string[];
  segment?: string | string[];
  status?: string | string[];
}): RecoveryCaseFilters {
  const parsedPage = Number.parseInt(firstValue(input?.page) ?? "1", 10);

  return {
    environment: getEnumValue(
      RECOVERY_CASE_ENVIRONMENT_FILTERS,
      firstValue(input?.environment),
      "all",
    ),
    page: Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    segment: getEnumValue(
      RECOVERY_CASE_SEGMENT_FILTERS,
      firstValue(input?.segment),
      "all",
    ),
    status: getEnumValue(
      RECOVERY_CASE_STATUS_FILTERS,
      firstValue(input?.status),
      "open",
    ),
  };
}

function getCustomerEmail(payload: Record<string, unknown>) {
  return typeof payload.customer_email === "string" && payload.customer_email.trim()
    ? payload.customer_email
    : null;
}

function getAudienceSegment(value: string | null): RecoveryCaseAudienceSegment {
  return value === "subscription" || value === "standalone" ? value : "unknown";
}

async function getCaseMessageFacts(
  userId: string,
  failedPaymentIds: string[],
): Promise<RecoveryCaseMessageFacts> {
  const emptyFacts = {
    nextMessageByCase: new Map<string, string>(),
    providerDeliveryStatusesByCase: new Map<string, string[]>(),
  };

  if (failedPaymentIds.length === 0) {
    return emptyFacts;
  }

  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return emptyFacts;
  }

  const { data, error } = await supabase
    .from(RECOVERY_MESSAGES_TABLE)
    .select("failed_payment_id, provider_delivery_status, scheduled_for, status")
    .eq("user_id", userId)
    .in("failed_payment_id", failedPaymentIds)
    .order("scheduled_for", { ascending: true })
    .returns<RecoveryMessageRow[]>();

  if (error) {
    throw new Error(`Unable to load recovery case message facts: ${error.message}`);
  }

  const nextMessageByCase = new Map<string, string>();
  const providerDeliveryStatusesByCase = new Map<string, string[]>();

  for (const message of data ?? []) {
    if (
      (message.status === "pending" || message.status === "scheduled") &&
      !nextMessageByCase.has(message.failed_payment_id)
    ) {
      nextMessageByCase.set(message.failed_payment_id, message.scheduled_for);
    }

    if (message.provider_delivery_status) {
      const statuses = providerDeliveryStatusesByCase.get(message.failed_payment_id) ?? [];
      statuses.push(message.provider_delivery_status);
      providerDeliveryStatusesByCase.set(message.failed_payment_id, statuses);
    }
  }

  return { nextMessageByCase, providerDeliveryStatusesByCase };
}

export async function getRecoveryCasesPage(
  userId: string,
  filters: RecoveryCaseFilters,
): Promise<RecoveryCasesPage> {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return { cases: [], filters, pageCount: 0, pageSize: PAGE_SIZE, totalCount: 0 };
  }

  let query = supabase
    .from(FAILED_PAYMENTS_TABLE)
    .select(RECOVERY_CASE_SELECT, { count: "exact" })
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (filters.status === "open") {
    query = query.in("case_status", OPEN_CASE_STATUSES);
  } else if (filters.status !== "all") {
    query = query.eq("case_status", filters.status);
  }

  if (filters.segment !== "all") {
    query = query.eq("audience_segment", filters.segment);
  }

  if (filters.environment === "live") {
    query = query.eq("livemode", true);
  } else if (filters.environment === "test") {
    query = query.eq("livemode", false);
  } else if (filters.environment === "unknown") {
    query = query.is("livemode", null);
  }

  const offset = (filters.page - 1) * PAGE_SIZE;
  const { count, data, error } = await query
    .range(offset, offset + PAGE_SIZE - 1)
    .returns<FailedPaymentRow[]>();

  if (error) {
    throw new Error(`Unable to load recovery cases: ${error.message}`);
  }

  const rows = data ?? [];
  const messageFacts = await getCaseMessageFacts(
    userId,
    rows.map((row) => row.id),
  );
  const totalCount = count ?? 0;

  return {
    cases: rows.map((row) => mapRecoveryCase(row, messageFacts)),
    filters,
    pageCount: Math.ceil(totalCount / PAGE_SIZE),
    pageSize: PAGE_SIZE,
    totalCount,
  };
}

function mapRecoveryCase(
  row: FailedPaymentRow,
  messageFacts: RecoveryCaseMessageFacts,
): RecoveryCaseListItem {
  const diagnostic = getRecoveryDeclineDiagnostic({
    declineCode: row.decline_code,
    failureCode: row.failure_code,
    failureMessage: row.failure_message,
  });

  const caseStatus = getEffectiveRecoveryCaseStatus(row.case_status, row.status);
  const attentionFlags = getRecoveryAttentionFlags({
    caseStatus,
    providerDeliveryStatuses:
      messageFacts.providerDeliveryStatusesByCase.get(row.id) ?? [],
  });

  return {
    amountDue: row.amount_due,
    attentionFlags,
    attentionLevel: getHighestRecoveryAttentionLevel(attentionFlags),
    attemptCount: row.attempt_count,
    audienceSegment: getAudienceSegment(row.audience_segment),
    caseStatus,
    createdAt: row.created_at,
    currency: row.currency,
    customerEmail: getCustomerEmail(row.latest_payload),
    customerId: row.stripe_customer_id,
    failureExplanation: diagnostic.explanation,
    failureTitle: diagnostic.title,
    id: row.id,
    invoiceId: row.stripe_invoice_id,
    invoiceStatus: row.invoice_status,
    livemode: row.livemode,
    nextEmailAt: messageFacts.nextMessageByCase.get(row.id) ?? null,
    nextPaymentAttemptAt: row.next_payment_attempt_at,
    recoveredAt: row.recovered_at,
    recoveryStage: row.recovery_stage,
    updatedAt: row.updated_at,
  };
}

export async function getRecoveryCaseById(
  userId: string,
  failedPaymentId: string,
): Promise<RecoveryCaseListItem | null> {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from(FAILED_PAYMENTS_TABLE)
    .select(RECOVERY_CASE_SELECT)
    .eq("user_id", userId)
    .eq("id", failedPaymentId)
    .maybeSingle<FailedPaymentRow>();

  if (error) {
    throw new Error(`Unable to load recovery case: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const messageFacts = await getCaseMessageFacts(userId, [data.id]);
  return mapRecoveryCase(data, messageFacts);
}
