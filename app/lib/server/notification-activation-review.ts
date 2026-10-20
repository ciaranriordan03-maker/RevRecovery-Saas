import "server-only";

import {
  buildNotificationActivationReview,
  unavailableNotificationActivationReview,
  type NotificationActivationReview,
} from "../recovery/notification-activation-review";
import { isEnvironmentFlagEnabled } from "../recovery/environment-policy";
import { createSupabaseAdminClient } from "../supabase/admin";

type AccountRow = {
  essential_notification_test_recipient: string | null;
  essential_notifications_delivery_mode: "disabled" | "test";
  essential_notifications_enabled: boolean;
};

type DomainRow = { domain: string; status: string };
type EventRow = { id: string; provider_message_id: string | null; sent_at: string | null };
type AttemptRow = { outcome: string; provider_message_id: string | null; reason_code: string };

export async function getNotificationActivationReviewForUser(
  userId: string,
): Promise<NotificationActivationReview> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return unavailableNotificationActivationReview();

  try {
    const [{ data: account, error: accountError }, { data: domain, error: domainError }, { data: drillEvent, error: drillError }] = await Promise.all([
      supabase
        .from("recovery_account_settings")
        .select("essential_notifications_enabled, essential_notifications_delivery_mode, essential_notification_test_recipient")
        .eq("user_id", userId)
        .maybeSingle<AccountRow>(),
      supabase
        .from("recovery_sending_domains")
        .select("domain, status")
        .eq("user_id", userId)
        .maybeSingle<DomainRow>(),
      supabase
        .from("recovery_notification_events")
        .select("id, sent_at, provider_message_id")
        .eq("user_id", userId)
        .contains("payload", { drill: "D4i" })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<EventRow>(),
    ]);

    if (accountError || domainError || drillError || !account) {
      return unavailableNotificationActivationReview();
    }

    let blockedDrill = null;
    if (drillEvent) {
      const { data: attempt, error: attemptError } = await supabase
        .from("recovery_notification_delivery_attempts")
        .select("outcome, reason_code, provider_message_id")
        .eq("user_id", userId)
        .eq("event_id", drillEvent.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<AttemptRow>();

      if (attemptError) return unavailableNotificationActivationReview();
      if (attempt) {
        blockedDrill = {
          eventId: drillEvent.id,
          eventSent: Boolean(drillEvent.sent_at),
          outcome: attempt.outcome,
          providerMessageId: attempt.provider_message_id ?? drillEvent.provider_message_id,
          reason: attempt.reason_code,
        };
      }
    }

    return buildNotificationActivationReview({
      accountEnabled: account.essential_notifications_enabled,
      accountMode: account.essential_notifications_delivery_mode,
      approvedRecipient: account.essential_notification_test_recipient,
      blockedDrill,
      globalEnabled: isEnvironmentFlagEnabled(
        process.env.ESSENTIAL_NOTIFICATION_DELIVERY_ENABLED,
      ),
      sendingDomain: domain?.domain ?? null,
      sendingDomainStatus: domain?.status ?? null,
    });
  } catch {
    return unavailableNotificationActivationReview();
  }
}
