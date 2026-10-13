import "server-only";

import {
  getNotificationTestRecipientInputError,
  isNotificationTestRecipientAction,
  normalizeNotificationTestRecipient,
  type NotificationTestRecipientAction,
} from "../recovery/notification-test-recipient-policy";
import { createSupabaseAdminClient } from "../supabase/admin";

type NotificationRecipientRow = {
  essential_notification_test_recipient: string | null;
  essential_notification_test_recipient_approved_at: string | null;
  essential_notification_test_recipient_candidate: string | null;
  essential_notification_test_recipient_selected_at: string | null;
  essential_notifications_delivery_mode: "disabled" | "test";
  essential_notifications_enabled: boolean;
};

export type NotificationTestRecipientSettings = {
  approvedAt: string | null;
  approvedRecipient: string | null;
  deliveryEnabled: false;
  deliveryMode: "disabled" | "test";
  proposedRecipient: string | null;
  selectedAt: string | null;
};

export class NotificationTestRecipientSettingsError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "NotificationTestRecipientSettingsError";
  }
}

function toSettings(row: NotificationRecipientRow): NotificationTestRecipientSettings {
  return {
    approvedAt: row.essential_notification_test_recipient_approved_at,
    approvedRecipient: row.essential_notification_test_recipient,
    deliveryEnabled: false,
    deliveryMode: row.essential_notifications_delivery_mode,
    proposedRecipient: row.essential_notification_test_recipient_candidate,
    selectedAt: row.essential_notification_test_recipient_selected_at,
  };
}

export async function getNotificationTestRecipientSettingsForUser(
  userId: string,
): Promise<NotificationTestRecipientSettings> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new NotificationTestRecipientSettingsError(
      "Notification recipient settings are unavailable.",
      503,
    );
  }

  const { data, error } = await supabase
    .from("recovery_account_settings")
    .select(
      "essential_notification_test_recipient, essential_notification_test_recipient_candidate, essential_notification_test_recipient_selected_at, essential_notification_test_recipient_approved_at, essential_notifications_delivery_mode, essential_notifications_enabled",
    )
    .eq("user_id", userId)
    .maybeSingle<NotificationRecipientRow>();

  if (error) {
    throw new NotificationTestRecipientSettingsError(
      `Unable to load notification recipient settings: ${error.message}`,
      500,
    );
  }
  if (!data) {
    throw new NotificationTestRecipientSettingsError(
      "Connect Stripe before configuring a notification test recipient.",
      409,
    );
  }

  return toSettings(data);
}

export async function updateNotificationTestRecipientSettingsForUser(
  userId: string,
  input: { action?: unknown; recipient?: unknown },
) {
  if (!isNotificationTestRecipientAction(input.action)) {
    throw new NotificationTestRecipientSettingsError("Choose a valid review action.", 400);
  }

  const action: NotificationTestRecipientAction = input.action;
  const inputError = getNotificationTestRecipientInputError({
    action,
    recipient: input.recipient,
  });
  if (inputError) {
    throw new NotificationTestRecipientSettingsError(inputError, 400);
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new NotificationTestRecipientSettingsError(
      "Notification recipient settings are unavailable.",
      503,
    );
  }

  const { error } = await supabase.rpc("review_notification_test_recipient", {
    requested_action: action,
    requested_recipient:
      action === "clear" ? null : normalizeNotificationTestRecipient(input.recipient),
    requested_user_id: userId,
  });

  if (error) {
    const message = error.message.includes("proposed recipient")
      ? "Save and review a proposed recipient before approving it."
      : `Unable to update notification recipient: ${error.message}`;
    throw new NotificationTestRecipientSettingsError(message, 409);
  }

  return getNotificationTestRecipientSettingsForUser(userId);
}
