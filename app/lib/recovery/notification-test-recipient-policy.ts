export type NotificationTestRecipientAction = "approve" | "clear" | "propose";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isNotificationTestRecipientAction(
  value: unknown,
): value is NotificationTestRecipientAction {
  return value === "approve" || value === "clear" || value === "propose";
}

export function normalizeNotificationTestRecipient(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function getNotificationTestRecipientInputError({
  action,
  recipient,
}: {
  action: NotificationTestRecipientAction;
  recipient: unknown;
}) {
  if (action === "clear") return null;

  const normalizedRecipient = normalizeNotificationTestRecipient(recipient);
  if (!EMAIL_PATTERN.test(normalizedRecipient)) {
    return "Enter a valid test notification recipient.";
  }

  return null;
}
