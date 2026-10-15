export type NotificationTestAuthorizationAction = "approve" | "request" | "revoke";
export type NotificationTestAuthorizationStatus =
  | "approved"
  | "consumed"
  | "expired"
  | "pending"
  | "revoked";

export function getEffectiveNotificationTestAuthorizationStatus({
  expiresAt,
  now = Date.now(),
  status,
}: {
  expiresAt: string;
  now?: number;
  status: NotificationTestAuthorizationStatus;
}): NotificationTestAuthorizationStatus {
  if (status !== "pending" && status !== "approved") return status;

  const expiresAtTimestamp = Date.parse(expiresAt);
  if (!Number.isFinite(expiresAtTimestamp) || expiresAtTimestamp <= now) return "expired";

  return status;
}

export function isNotificationTestAuthorizationAction(
  value: unknown,
): value is NotificationTestAuthorizationAction {
  return value === "request" || value === "approve" || value === "revoke";
}

export function getNotificationTestAuthorizationInputError({
  action,
  authorizationId,
}: {
  action: NotificationTestAuthorizationAction;
  authorizationId: unknown;
}) {
  if (action === "request") return null;
  if (typeof authorizationId !== "string" || !/^[0-9a-f-]{36}$/i.test(authorizationId)) {
    return "Choose an active notification test authorization.";
  }
  return null;
}
