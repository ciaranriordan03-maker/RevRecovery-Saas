export type NotificationTestAuthorizationAction = "approve" | "request" | "revoke";

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
