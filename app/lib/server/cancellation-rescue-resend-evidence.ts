import "server-only";

import {
  CANCELLATION_TEST_EMAIL_FIXTURE,
  CANCELLATION_TEST_EMAIL_FLOW,
  CANCELLATION_TEST_EMAIL_PROVIDER_ID,
  CANCELLATION_TEST_EMAIL_TIMEOUT_MS,
  CANCELLATION_TEST_EMAIL_UUID,
  normalizeCancellationTestEmailRecipient,
} from "../cancellation-rescue/test-email-policy";
import { normalizeResendWebhookEvent, verifyResendWebhookPayload } from "./resend-webhooks";

const MAX_WEBHOOK_BYTES = 32_768;
const eventPriority = {
  sent: 0,
  delivery_delayed: 1,
  bounced: 2,
  delivered: 3,
  failed: 4,
  suppressed: 5,
  complained: 6,
} as const;

type DeliveryEvent = keyof typeof eventPriority;
type SuppressionReason = "bounced" | "complained" | "suppressed";

export type CancellationTestEmailEvidence = {
  authorizationId: string;
  eventId: string;
  providerMessageId: string;
  occurredAt: string;
  kind: DeliveryEvent;
  suppressionReason: SuppressionReason | null;
};

type EvidenceBinding = {
  authorizationId: string;
  recipient: string;
  sendingDomain: string;
  reservedAt: string;
  expiresAt: string;
  providerMessageId: string | null;
  status: "reserved" | "outcome_unknown" | "provider_accepted";
};

type EvidenceResult =
  | { outcome: "invalid" | "unmatched" | "conflict" | "duplicate" }
  | {
      outcome: "recordable";
      evidence: CancellationTestEmailEvidence;
      deliveryStatus: DeliveryEvent;
      suppressionReason: SuppressionReason | null;
    };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDeliveryEvent(kind: string): kind is DeliveryEvent {
  return Object.hasOwn(eventPriority, kind);
}

/**
 * Review signed evidence for one already-reserved, Development test attempt.
 * Outputs sanitized evidence only; it never writes, contacts the provider, or
 * changes the reservation. Persistence must enforce the same binding and event
 * uniqueness atomically before the first connected test.
 */
export function reviewCancellationResendTestEvidence({
  binding,
  history,
  headers,
  payload,
  signingSecret,
}: {
  binding: EvidenceBinding;
  history: readonly CancellationTestEmailEvidence[];
  headers: Headers;
  payload: string;
  signingSecret: string;
}): EvidenceResult {
  if (Buffer.byteLength(payload, "utf8") > MAX_WEBHOOK_BYTES) return { outcome: "invalid" };

  try {
    const { providerEventId, verifiedEvent } = verifyResendWebhookPayload({
      headers, payload, secret: signingSecret,
    });
    if (!isObject(verifiedEvent) || !isObject(verifiedEvent.data)) return { outcome: "invalid" };
    const data = verifiedEvent.data;
    const tags = data.tags;
    const event = normalizeResendWebhookEvent(providerEventId, verifiedEvent);
    if (!isDeliveryEvent(event.eventType)) return { outcome: "unmatched" };
    const kind = event.eventType;

    const recipient = normalizeCancellationTestEmailRecipient(binding.recipient);
    const sentFrom = `cancellation-test@${binding.sendingDomain}`;
    if (
      !CANCELLATION_TEST_EMAIL_UUID.test(binding.authorizationId) ||
      !["reserved", "outcome_unknown", "provider_accepted"].includes(binding.status) ||
      !isObject(tags) ||
      tags.rr_flow !== CANCELLATION_TEST_EMAIL_FLOW ||
      tags.rr_test_authorization !== binding.authorizationId ||
      !recipient || !Array.isArray(data.to) || data.to.length !== 1 ||
      typeof data.to[0] !== "string" || normalizeCancellationTestEmailRecipient(data.to[0]) !== recipient ||
      (data.from !== sentFrom && data.from !== `RevRecovery Test <${sentFrom}>`) ||
      data.subject !== CANCELLATION_TEST_EMAIL_FIXTURE.subject
    ) return { outcome: "unmatched" };

    const providerCreatedAt = typeof data.created_at === "string" ? Date.parse(data.created_at) : NaN;
    const reservedAt = Date.parse(binding.reservedAt);
    const expiresAt = Date.parse(binding.expiresAt);
    if (
      !CANCELLATION_TEST_EMAIL_PROVIDER_ID.test(event.providerMessageId) ||
      ![providerCreatedAt, reservedAt, expiresAt].every(Number.isFinite) ||
      reservedAt >= expiresAt ||
      providerCreatedAt < reservedAt || providerCreatedAt > expiresAt + CANCELLATION_TEST_EMAIL_TIMEOUT_MS ||
      providerCreatedAt > Date.parse(event.occurredAt)
    ) return { outcome: "unmatched" };

    let boundMessageId = binding.providerMessageId;
    if (binding.status === "provider_accepted" && !boundMessageId) return { outcome: "conflict" };
    for (const prior of history) {
      if (prior.authorizationId !== binding.authorizationId ||
        (boundMessageId !== null && prior.providerMessageId !== boundMessageId)) {
        return { outcome: "conflict" };
      }
      boundMessageId = prior.providerMessageId;
    }
    if (boundMessageId !== null && boundMessageId !== event.providerMessageId) return { outcome: "conflict" };

    const evidence: CancellationTestEmailEvidence = {
      authorizationId: binding.authorizationId,
      eventId: event.providerEventId,
      providerMessageId: event.providerMessageId,
      occurredAt: event.occurredAt,
      kind,
      suppressionReason: event.shouldSuppressRecipient &&
        (kind === "bounced" || kind === "suppressed" || kind === "complained") ? kind : null,
    };
    const duplicate = history.find(prior => prior.eventId === evidence.eventId);
    if (duplicate) {
      return {
        outcome: duplicate.kind === evidence.kind &&
          duplicate.suppressionReason === evidence.suppressionReason &&
          duplicate.occurredAt === evidence.occurredAt ? "duplicate" : "conflict",
      };
    }

    const all = [...history, evidence];
    // A late sent/delayed notification must not overwrite definitive evidence.
    // A permanent bounce or complaint also never clears after a delivery event.
    const priority = (item: CancellationTestEmailEvidence) =>
      (item.suppressionReason ? 10 : 0) + eventPriority[item.kind];
    const strongest = all.reduce((first, next) => priority(next) > priority(first) ? next : first);
    return {
      outcome: "recordable",
      evidence,
      deliveryStatus: strongest.kind,
      suppressionReason: strongest.suppressionReason,
    };
  } catch {
    return { outcome: "invalid" };
  }
}
