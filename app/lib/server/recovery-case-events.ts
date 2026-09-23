import "server-only";

import { createSupabaseAdminClient } from "../supabase/admin";

export const RECOVERY_CASE_EVENT_SOURCES = [
  "stripe",
  "case_transition",
  "recovery_message_schedule",
  "recovery_message_status",
  "provider_message_event",
] as const;

export type RecoveryCaseEventSource =
  (typeof RECOVERY_CASE_EVENT_SOURCES)[number];

export type RecoveryCaseTimelineEvent = {
  eventType: string;
  id: string;
  livemode: boolean | null;
  metadata: Record<string, unknown>;
  occurredAt: string;
  recordedAt: string;
  source: RecoveryCaseEventSource;
};

type RecoveryCaseEventRow = {
  event_type: string;
  id: string;
  livemode: boolean | null;
  metadata: Record<string, unknown> | null;
  occurred_at: string;
  recorded_at: string;
  source: RecoveryCaseEventSource;
};

const RECOVERY_CASE_EVENTS_TABLE = "recovery_case_events";

function timelineStep(row: RecoveryCaseEventRow) {
  const step = row.metadata?.step_number;
  return typeof step === "number" && Number.isFinite(step)
    ? step
    : Number.POSITIVE_INFINITY;
}

function compareTimelineRows(left: RecoveryCaseEventRow, right: RecoveryCaseEventRow) {
  const occurredAtDifference = left.occurred_at.localeCompare(right.occurred_at);
  if (occurredAtDifference !== 0) return occurredAtDifference;

  const recordedAtDifference = left.recorded_at.localeCompare(right.recorded_at);
  if (recordedAtDifference !== 0) return recordedAtDifference;

  const stepDifference = timelineStep(left) - timelineStep(right);
  if (stepDifference !== 0) return stepDifference;

  return left.id.localeCompare(right.id);
}

export function buildRecoveryCaseTimeline(
  rows: RecoveryCaseEventRow[],
): RecoveryCaseTimelineEvent[] {
  return [...rows].sort(compareTimelineRows).map((row) => ({
    eventType: row.event_type,
    id: row.id,
    livemode: row.livemode,
    metadata: row.metadata ?? {},
    occurredAt: row.occurred_at,
    recordedAt: row.recorded_at,
    source: row.source,
  }));
}

export async function getRecoveryCaseTimeline({
  failedPaymentId,
  userId,
}: {
  failedPaymentId: string;
  userId: string;
}): Promise<RecoveryCaseTimelineEvent[]> {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from(RECOVERY_CASE_EVENTS_TABLE)
    .select("id, event_type, source, occurred_at, recorded_at, livemode, metadata")
    .eq("user_id", userId)
    .eq("failed_payment_id", failedPaymentId)
    .order("occurred_at", { ascending: true })
    .order("recorded_at", { ascending: true })
    .order("id", { ascending: true })
    .returns<RecoveryCaseEventRow[]>();

  if (error) {
    throw new Error(`Unable to load recovery case timeline: ${error.message}`);
  }

  return buildRecoveryCaseTimeline(data ?? []);
}
