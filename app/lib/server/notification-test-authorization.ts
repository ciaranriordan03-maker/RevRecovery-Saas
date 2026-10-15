import "server-only";

import {
  getEffectiveNotificationTestAuthorizationStatus,
  getNotificationTestAuthorizationInputError,
  isNotificationTestAuthorizationAction,
  type NotificationTestAuthorizationAction,
  type NotificationTestAuthorizationStatus,
} from "../recovery/notification-test-authorization-policy";
import { createSupabaseAdminClient } from "../supabase/admin";

type AuthorizationRow = {
  approved_at: string | null;
  expires_at: string;
  id: string;
  recipient_email: string;
  requested_at: string;
  status: NotificationTestAuthorizationStatus;
};

export type NotificationTestAuthorization = {
  approvedAt: string | null;
  expiresAt: string;
  id: string;
  recipientEmail: string;
  requestedAt: string;
  status: AuthorizationRow["status"];
};

export type NotificationTestAuthorizationSettings = {
  authorization: NotificationTestAuthorization | null;
  deliveryEnabled: false;
};

export class NotificationTestAuthorizationError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "NotificationTestAuthorizationError";
  }
}

function toAuthorization(row: AuthorizationRow): NotificationTestAuthorization {
  return {
    approvedAt: row.approved_at,
    expiresAt: row.expires_at,
    id: row.id,
    recipientEmail: row.recipient_email,
    requestedAt: row.requested_at,
    status: getEffectiveNotificationTestAuthorizationStatus({
      expiresAt: row.expires_at,
      status: row.status,
    }),
  };
}

export async function getNotificationTestAuthorizationForUser(
  userId: string,
): Promise<NotificationTestAuthorizationSettings> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new NotificationTestAuthorizationError("Notification authorization storage is unavailable.", 503);

  const { data, error } = await supabase
    .from("recovery_notification_test_authorizations")
    .select("id, recipient_email, status, requested_at, approved_at, expires_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<AuthorizationRow>();

  if (error) throw new NotificationTestAuthorizationError(`Unable to load notification authorization: ${error.message}`, 500);
  return { authorization: data ? toAuthorization(data) : null, deliveryEnabled: false };
}

export async function updateNotificationTestAuthorizationForUser(
  userId: string,
  input: { action?: unknown; authorizationId?: unknown },
) {
  if (!isNotificationTestAuthorizationAction(input.action)) {
    throw new NotificationTestAuthorizationError("Choose a valid authorization action.", 400);
  }

  const action: NotificationTestAuthorizationAction = input.action;
  const inputError = getNotificationTestAuthorizationInputError({
    action,
    authorizationId: input.authorizationId,
  });
  if (inputError) throw new NotificationTestAuthorizationError(inputError, 400);

  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new NotificationTestAuthorizationError("Notification authorization storage is unavailable.", 503);

  const { error } = await supabase.rpc("review_notification_test_authorization", {
    requested_action: action,
    requested_authorization_id: action === "request" ? null : input.authorizationId,
    requested_global_delivery_enabled: process.env.ESSENTIAL_NOTIFICATION_DELIVERY_ENABLED === "true",
    requested_user_id: userId,
  });

  if (error) throw new NotificationTestAuthorizationError(`Unable to update notification authorization: ${error.message}`, 409);
  return getNotificationTestAuthorizationForUser(userId);
}
