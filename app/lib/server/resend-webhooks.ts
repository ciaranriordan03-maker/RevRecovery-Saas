import "server-only";

import { Webhook } from "svix";

export type RecoveryMessageEventType =
  | "scheduled"
  | "sent"
  | "delivered"
  | "delivery_delayed"
  | "bounced"
  | "complained"
  | "opened"
  | "clicked"
  | "failed"
  | "suppressed"
  | "canceled"
  | "unknown";

export type VerifiedResendWebhookEvent = {
  eventType: RecoveryMessageEventType;
  metadata: Record<string, string>;
  occurredAt: string;
  providerEventId: string;
  providerEventType: string;
  providerMessageId: string;
  shouldSuppressRecipient: boolean;
};

export class ResendWebhookValidationError extends Error {
  constructor() {
    super("Invalid Resend webhook.");
    this.name = "ResendWebhookValidationError";
  }
}

const RESEND_EVENT_TYPES: Record<string, RecoveryMessageEventType> = {
  "email.scheduled": "scheduled",
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.delivery_delayed": "delivery_delayed",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.failed": "failed",
  "email.suppressed": "suppressed",
  "email.canceled": "canceled",
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRequiredString(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    throw new ResendWebhookValidationError();
  }

  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new ResendWebhookValidationError();
  }

  return normalized;
}

function getOptionalMetadataString(value: unknown, maxLength = 100) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

export function normalizeResendWebhookEvent(
  providerEventId: string,
  rawEvent: unknown,
): VerifiedResendWebhookEvent {
  if (!isObject(rawEvent) || !isObject(rawEvent.data)) {
    throw new ResendWebhookValidationError();
  }

  const providerEventType = getRequiredString(rawEvent.type, 100);
  const providerMessageId = getRequiredString(rawEvent.data.email_id, 255);
  const createdAt = getRequiredString(rawEvent.created_at, 100);
  const occurredAt = new Date(createdAt);

  if (Number.isNaN(occurredAt.getTime())) {
    throw new ResendWebhookValidationError();
  }

  const eventType = RESEND_EVENT_TYPES[providerEventType] ?? "unknown";
  const metadata: Record<string, string> = {};
  const bounce = isObject(rawEvent.data.bounce) ? rawEvent.data.bounce : null;
  const suppressed = isObject(rawEvent.data.suppressed)
    ? rawEvent.data.suppressed
    : null;
  const bounceType = getOptionalMetadataString(bounce?.type);
  const bounceSubType = getOptionalMetadataString(bounce?.subType);
  const suppressedType = getOptionalMetadataString(suppressed?.type);

  if (bounceType) metadata.bounceType = bounceType;
  if (bounceSubType) metadata.bounceSubType = bounceSubType;
  if (suppressedType) metadata.suppressedType = suppressedType;

  return {
    eventType,
    metadata,
    occurredAt: occurredAt.toISOString(),
    providerEventId: getRequiredString(providerEventId, 255),
    providerEventType,
    providerMessageId,
    shouldSuppressRecipient:
      eventType === "complained" ||
      eventType === "suppressed" ||
      (eventType === "bounced" && bounceType?.toLowerCase() === "permanent"),
  };
}

export function verifyAndNormalizeResendWebhook({
  headers,
  payload,
  secret,
}: {
  headers: Headers;
  payload: string;
  secret: string;
}) {
  const providerEventId = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signature = headers.get("svix-signature");

  if (!providerEventId || !timestamp || !signature || !secret.trim()) {
    throw new ResendWebhookValidationError();
  }

  try {
    new Webhook(secret).verify(payload, {
      "svix-id": providerEventId,
      "svix-signature": signature,
      "svix-timestamp": timestamp,
    });
  } catch {
    throw new ResendWebhookValidationError();
  }

  let verifiedEvent: unknown;
  try {
    verifiedEvent = JSON.parse(payload);
  } catch {
    throw new ResendWebhookValidationError();
  }

  return normalizeResendWebhookEvent(providerEventId, verifiedEvent);
}
