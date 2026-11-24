import "server-only";

import {
  CANCELLATION_TEST_EMAIL_FIXTURE,
  CANCELLATION_TEST_EMAIL_FLOW,
  CANCELLATION_TEST_EMAIL_PROVIDER_ID,
  CANCELLATION_TEST_EMAIL_TIMEOUT_MS,
  CANCELLATION_TEST_EMAIL_UUID,
  CANCELLATION_TEST_EMAIL_WEBHOOK_MAX_BYTES,
  normalizeCancellationTestEmailRecipient,
} from "../cancellation-rescue/test-email-policy";
import { getSendingDomainValidationError, normalizeSendingDomain } from "../email/sending-domain";
import { normalizeResendWebhookEvent, verifyResendWebhookPayload } from "./resend-webhooks";

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

type SignedPayload = {
  headers: Headers;
  payload: string;
  signingSecret: string;
};

type VerifiedFacts =
  | { outcome: "invalid" | "unmatched" }
  | {
    outcome: "verified";
    evidence: CancellationTestEmailEvidence;
    sendingDomain: string;
    recipient: string;
    providerCreatedAt: number;
  };

function verifyCancellationResendEvidence({ headers, payload, signingSecret }: SignedPayload): VerifiedFacts {
  if (Buffer.byteLength(payload, "utf8") > CANCELLATION_TEST_EMAIL_WEBHOOK_MAX_BYTES) return { outcome: "invalid" };

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

    const recipient = Array.isArray(data.to) && data.to.length === 1 && typeof data.to[0] === "string"
      ? normalizeCancellationTestEmailRecipient(data.to[0]) : null;
    const sendingDomain = typeof data.from === "string" ? (
      /^cancellation-test@([a-z0-9.-]+)$/.exec(data.from)?.[1] ??
      /^RevRecovery Test <cancellation-test@([a-z0-9.-]+)>$/.exec(data.from)?.[1]
    ) : null;
    if (
      !isObject(tags) ||
      tags.rr_flow !== CANCELLATION_TEST_EMAIL_FLOW ||
      typeof tags.rr_test_authorization !== "string" ||
      !CANCELLATION_TEST_EMAIL_UUID.test(tags.rr_test_authorization) ||
      !recipient || !sendingDomain || normalizeSendingDomain(sendingDomain) !== sendingDomain ||
      getSendingDomainValidationError(sendingDomain) !== null ||
      data.subject !== CANCELLATION_TEST_EMAIL_FIXTURE.subject
    ) return { outcome: "unmatched" };

    const providerCreatedAt = typeof data.created_at === "string" ? Date.parse(data.created_at) : NaN;
    if (
      !CANCELLATION_TEST_EMAIL_PROVIDER_ID.test(event.providerMessageId) ||
      !/^[a-zA-Z0-9_-]{1,255}$/.test(event.providerEventId) ||
      !Number.isFinite(providerCreatedAt) ||
      providerCreatedAt > Date.parse(event.occurredAt)
    ) return { outcome: "unmatched" };

    const evidence: CancellationTestEmailEvidence = {
      authorizationId: tags.rr_test_authorization,
      eventId: event.providerEventId,
      providerMessageId: event.providerMessageId,
      occurredAt: event.occurredAt,
      kind,
      suppressionReason: event.shouldSuppressRecipient &&
        (kind === "bounced" || kind === "suppressed" || kind === "complained") ? kind : null,
    };
    return {
      outcome: "verified",
      evidence,
      sendingDomain,
      recipient,
      providerCreatedAt,
    };
  } catch {
    return { outcome: "invalid" };
  }
}

/** Read-only review helper. Storage rechecks the same binding atomically. */
export function reviewCancellationResendTestEvidence({
  binding, history, ...input
}: SignedPayload & {
  binding: EvidenceBinding;
  history: readonly CancellationTestEmailEvidence[];
}): EvidenceResult {
  const result = verifyCancellationResendEvidence(input);
  if (result.outcome !== "verified") return { outcome: result.outcome };
  const { evidence, recipient, sendingDomain, providerCreatedAt } = result;
  const reservedAt = Date.parse(binding.reservedAt);
  const expiresAt = Date.parse(binding.expiresAt);
  if (
    evidence.authorizationId !== binding.authorizationId ||
    recipient !== normalizeCancellationTestEmailRecipient(binding.recipient) ||
    sendingDomain !== binding.sendingDomain ||
    !["reserved", "outcome_unknown", "provider_accepted"].includes(binding.status) ||
    ![reservedAt, expiresAt].every(Number.isFinite) || reservedAt >= expiresAt ||
    providerCreatedAt < reservedAt || providerCreatedAt > expiresAt + CANCELLATION_TEST_EMAIL_TIMEOUT_MS
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
  if (boundMessageId !== null && boundMessageId !== evidence.providerMessageId) {
    return { outcome: "conflict" };
  }
  const duplicate = history.find(prior => prior.eventId === evidence.eventId);
  if (duplicate) {
    return {
      outcome: duplicate.kind === evidence.kind &&
        duplicate.suppressionReason === evidence.suppressionReason &&
        duplicate.occurredAt === evidence.occurredAt ? "duplicate" : "conflict",
    };
  }
  const priority = (item: CancellationTestEmailEvidence) =>
    (item.suppressionReason ? 10 : 0) + eventPriority[item.kind];
  const strongest = history.reduce((first, next) => priority(next) > priority(first) ? next : first, evidence);
  return {
    outcome: "recordable", evidence,
    deliveryStatus: strongest.kind,
    suppressionReason: strongest.suppressionReason,
  };
}

type RecordEvidenceInputs = {
  requested_authorization_id: string;
  requested_event_id: string;
  requested_provider_message_id: string;
  requested_recipient: string;
  requested_sending_domain: string;
  requested_provider_created_at: string;
  requested_occurred_at: string;
  requested_event_kind: DeliveryEvent;
  requested_suppression_reason: SuppressionReason | null;
};

/**
 * Receive-only server integration. It cannot dispatch or retry email.
 * Do not pass a shared failed-payment webhook secret to this function.
 */
export async function recordCancellationResendTestEvidence({
  db,
  ...input
}: SignedPayload & {
  db: {
    rpc: (name: "record_cancellation_test_email_evidence", args: RecordEvidenceInputs) =>
      PromiseLike<{ data: unknown; error?: unknown }>;
  };
}) {
  const result = verifyCancellationResendEvidence(input);
  if (result.outcome !== "verified") return result.outcome;
  const { evidence } = result;
  let response;
  try {
    response = await db.rpc("record_cancellation_test_email_evidence", {
      requested_authorization_id: evidence.authorizationId,
      requested_event_id: evidence.eventId,
      requested_provider_message_id: evidence.providerMessageId,
      requested_recipient: result.recipient,
      requested_sending_domain: result.sendingDomain,
      requested_provider_created_at: new Date(result.providerCreatedAt).toISOString(),
      requested_occurred_at: evidence.occurredAt,
      requested_event_kind: evidence.kind,
      requested_suppression_reason: evidence.suppressionReason,
    });
  } catch {
    throw new Error("Cancellation test evidence storage is unavailable.");
  }
  const { data, error } = response;
  if (error) throw new Error("Cancellation test evidence storage is unavailable.");
  if (data === "recorded" || data === "duplicate" || data === "conflict" ||
    data === "unmatched" || data === "invalid") return data;
  throw new Error("Cancellation test evidence storage returned an unexpected response.");
}
