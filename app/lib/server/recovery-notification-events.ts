import "server-only";

import { ESSENTIAL_NOTIFICATION_RULES, type EssentialNotificationRule } from "../recovery/essential-notification-policy";
import {
  mapPreviewNotificationEvent,
  mapNotificationDeliveryReconciliation,
  mapNotificationResolutionReview,
  type NotificationReconciliationEvidence,
  type NotificationResolutionRequestAuditRow,
  type NotificationResolutionRequestRow,
  type PreviewNotificationHistory,
  type RecoveryNotificationEventRow,
} from "../recovery/notification-event-history";
import { buildRecoveryNotificationEventDraft } from "../recovery/notification-event-policy";
import { createSupabaseAdminClient } from "../supabase/admin";

const ACCOUNT_SETTINGS_TABLE = "recovery_account_settings";
const NOTIFICATION_EVENTS_TABLE = "recovery_notification_events";
const DELIVERY_ATTEMPTS_TABLE = "recovery_notification_delivery_attempts";
const TEST_AUTHORIZATIONS_TABLE = "recovery_notification_test_authorizations";
const RESOLUTION_REQUESTS_TABLE = "recovery_notification_resolution_requests";
const RESOLUTION_AUDIT_TABLE = "recovery_notification_resolution_request_audit";

type AccountSettingsRow = {
  id: string;
  user_id: string;
};

type DeliveryAttemptRow = {
  authorization_id: string | null;
  created_at: string;
  event_id: string;
  outcome: string;
  reason_code: string;
};

type TestAuthorizationRow = {
  approved_at: string | null;
  consumed_at: string | null;
  expires_at: string;
  id: string;
  requested_at: string;
  status: string;
};

export type PreviewNotificationRecordResult =
  | "duplicate"
  | "failed"
  | "recorded"
  | "skipped";

export async function getPreviewRecoveryNotificationHistory(
  userId: string,
): Promise<PreviewNotificationHistory> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { deliveries: [], events: [], state: "unavailable" };

  const { data, error } = await supabase
    .from(NOTIFICATION_EVENTS_TABLE)
    .select("id, rule_id, severity, status, recipient_email, occurred_at, cooldown_until, payload, claimed_at, provider_accepted_at, provider_message_id, sent_at, last_error")
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false })
    .limit(20)
    .returns<RecoveryNotificationEventRow[]>();

  if (error) return { deliveries: [], events: [], state: "unavailable" };

  const rows = data ?? [];
  const deliveries = rows.map((row) => mapNotificationDeliveryReconciliation(row)).filter((event) => event !== null);
  const deliveryIds = deliveries.map((delivery) => delivery.id);
  const evidenceByEvent = new Map<string, NotificationReconciliationEvidence>();
  let evidenceAvailable = true;

  if (deliveryIds.length > 0) {
    const { data: attempts, error: attemptsError } = await supabase
      .from(DELIVERY_ATTEMPTS_TABLE)
      .select("event_id, authorization_id, outcome, reason_code, created_at")
      .eq("user_id", userId)
      .in("event_id", deliveryIds)
      .order("created_at", { ascending: true })
      .returns<DeliveryAttemptRow[]>();

    if (attemptsError) {
      evidenceAvailable = false;
    } else {
      const authorizationIds = [...new Set((attempts ?? []).flatMap((attempt) => attempt.authorization_id ? [attempt.authorization_id] : []))];
      let authorizationById = new Map<string, TestAuthorizationRow>();

      if (authorizationIds.length > 0) {
        const { data: authorizations, error: authorizationError } = await supabase
          .from(TEST_AUTHORIZATIONS_TABLE)
          .select("id, status, requested_at, approved_at, expires_at, consumed_at")
          .eq("user_id", userId)
          .in("id", authorizationIds)
          .returns<TestAuthorizationRow[]>();
        if (authorizationError) {
          evidenceAvailable = false;
        } else {
          authorizationById = new Map((authorizations ?? []).map((authorization) => [authorization.id, authorization]));
        }
      }

      if (evidenceAvailable) {
        const { data: resolutionRequests, error: resolutionRequestsError } = await supabase
          .from(RESOLUTION_REQUESTS_TABLE)
          .select("id, event_id, requester_id, reviewer_id, status, decision_scope, evidence_summary, requested_at, expires_at, reviewed_at")
          .eq("user_id", userId)
          .in("event_id", deliveryIds)
          .order("requested_at", { ascending: false })
          .returns<NotificationResolutionRequestRow[]>();

        let resolutionAudit: NotificationResolutionRequestAuditRow[] = [];
        if (resolutionRequestsError) {
          evidenceAvailable = false;
        } else {
          const requestIds = (resolutionRequests ?? []).map((request) => request.id);
          if (requestIds.length > 0) {
            const { data: auditRows, error: auditError } = await supabase
              .from(RESOLUTION_AUDIT_TABLE)
              .select("request_id, actor_id, action, evidence_summary, created_at")
              .eq("user_id", userId)
              .in("request_id", requestIds)
              .order("created_at", { ascending: true })
              .returns<NotificationResolutionRequestAuditRow[]>();
            if (auditError) evidenceAvailable = false;
            else resolutionAudit = auditRows ?? [];
          }
        }

        for (const delivery of deliveries) {
          const eventAttempts = (attempts ?? []).filter((attempt) => attempt.event_id === delivery.id);
          const authorizationId = eventAttempts.find((attempt) => attempt.authorization_id)?.authorization_id;
          const authorization = authorizationId ? authorizationById.get(authorizationId) : null;
          const sourceRow = rows.find((row) => row.id === delivery.id);
          const resolutionRequest = (resolutionRequests ?? []).find((request) => request.event_id === delivery.id);
          evidenceByEvent.set(delivery.id, {
            attempts: eventAttempts.map((attempt) => ({
              occurredAt: attempt.created_at,
              outcome: attempt.outcome,
              reason: attempt.reason_code.replaceAll("_", " "),
            })),
            authorization: authorization ? {
              approvedAt: authorization.approved_at,
              consumedAt: authorization.consumed_at,
              expiresAt: authorization.expires_at,
              requestedAt: authorization.requested_at,
              status: authorization.status,
            } : null,
            reservation: {
              claimedAt: sourceRow?.claimed_at ?? null,
              claimRecorded: Boolean(sourceRow?.claimed_at),
            },
            resolutionReview: resolutionRequest
              ? mapNotificationResolutionReview(resolutionRequest, resolutionAudit)
              : null,
          });
        }
      }
    }
  }

  return {
    deliveries: deliveries.map((delivery) => ({
      ...delivery,
      evidence: evidenceByEvent.get(delivery.id) ?? delivery.evidence,
      evidenceState: evidenceAvailable ? "ready" as const : "unavailable" as const,
    })),
    events: (data ?? []).map(mapPreviewNotificationEvent).filter((event) => event !== null),
    state: "ready",
  };
}

function getRule(ruleId: EssentialNotificationRule["id"]) {
  const rule = ESSENTIAL_NOTIFICATION_RULES.find((candidate) => candidate.id === ruleId);
  if (!rule) throw new Error("Essential notification rule is not configured.");
  return rule;
}

export async function tryRecordPreviewRecoveryNotificationEvent({
  fingerprint,
  occurredAt = new Date().toISOString(),
  payload = {},
  ruleId,
  stripeAccountId,
  userId,
}: {
  fingerprint: string;
  occurredAt?: string;
  payload?: Record<string, boolean | number | string | null>;
  ruleId: EssentialNotificationRule["id"];
  stripeAccountId?: string;
  userId: string;
}): Promise<PreviewNotificationRecordResult> {
  try {
    const supabase = createSupabaseAdminClient();
    if (!supabase) return "skipped";

    let settingsQuery = supabase
      .from(ACCOUNT_SETTINGS_TABLE)
      .select("id, user_id")
      .eq("user_id", userId);

    if (stripeAccountId) {
      settingsQuery = settingsQuery.eq("stripe_account_id", stripeAccountId);
    }

    const { data: settings, error: settingsError } = await settingsQuery
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle<AccountSettingsRow>();

    if (settingsError) return "failed";
    if (!settings) return "skipped";

    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    const recipientEmail = userData.user?.email?.trim().toLowerCase();
    if (userError || !recipientEmail) return "skipped";

    const draft = buildRecoveryNotificationEventDraft({
      fingerprint,
      occurredAt,
      recipientEmail,
      ruleId,
    });
    const rule = getRule(ruleId);
    const { error } = await supabase.from(NOTIFICATION_EVENTS_TABLE).insert({
      account_settings_id: settings.id,
      cooldown_until: draft.cooldownUntil,
      deduplication_key: draft.deduplicationKey,
      delivery_enabled_snapshot: false,
      fingerprint: draft.fingerprint,
      occurred_at: draft.occurredAt,
      payload: { ...payload, previewOnly: true },
      recipient_email: draft.recipientEmail,
      rule_id: draft.ruleId,
      severity: rule.severity,
      status: "recorded",
      user_id: settings.user_id,
    });

    if (!error) return "recorded";
    if (error.code === "23505") return "duplicate";
    return "failed";
  } catch {
    // Preview recording must never interrupt Stripe, domain, or email processing.
    return "failed";
  }
}
