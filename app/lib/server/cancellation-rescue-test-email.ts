import "server-only";

import { randomUUID } from "node:crypto";
import {
  CANCELLATION_TEST_EMAIL_FIXTURE,
  CANCELLATION_TEST_EMAIL_KEY_PREFIX,
  CANCELLATION_TEST_EMAIL_PROVIDER_ID,
  CANCELLATION_TEST_EMAIL_UUID,
  isCancellationTestEmailDevelopment,
  normalizeCancellationTestEmailRecipient,
} from "../cancellation-rescue/test-email-policy";
import { getSendingDomainValidationError, normalizeSendingDomain } from "../email/sending-domain";
import { createSupabaseAdminClient } from "../supabase/admin";
import { getSupabaseUrl } from "../supabase/env";

type TestEmailEnvelope = {
  from: string;
  idempotencyKey: string;
  subject: string;
  text: string;
  to: readonly [string];
};

// No production caller is registered. A transport must make a single request,
// pass through the stable key, and never retry.
export type TestEmailTransport = (envelope: TestEmailEnvelope) => Promise<{ providerMessageId: string }>;

type TestEmailResult =
  | { outcome: "blocked" }
  | { outcome: "provider_accepted"; providerMessageId: string }
  | { outcome: "outcome_unknown" };

type Reservation = {
  expires_at: string;
  recipient_email: string;
  sending_domain: string;
};

/**
 * Operator-only boundary. No route, cron, webhook, or UI invokes this helper.
 * An ambiguous result is never permission to call the transport a second time.
 */
export async function executeCancellationRescueTestEmail({
  authorizationId,
  transport,
}: {
  authorizationId: string;
  transport?: TestEmailTransport;
}): Promise<TestEmailResult> {
  if (
    process.env.CANCELLATION_TEST_EMAIL_ENABLED !== "true" ||
    !CANCELLATION_TEST_EMAIL_UUID.test(authorizationId.toLowerCase()) ||
    !transport
  ) return { outcome: "blocked" };

  let db: ReturnType<typeof createSupabaseAdminClient>;
  const allowedRecipient = normalizeCancellationTestEmailRecipient(
    process.env.CANCELLATION_TEST_EMAIL_ALLOWED_RECIPIENT,
  );
  if (!allowedRecipient) return { outcome: "blocked" };
  try {
    if (!isCancellationTestEmailDevelopment({
      supabaseUrl: getSupabaseUrl(),
      vercelEnvironment: process.env.VERCEL_ENV,
      vercelTarget: process.env.VERCEL_TARGET_ENV,
    })) return { outcome: "blocked" };
    db = createSupabaseAdminClient();
  } catch {
    return { outcome: "blocked" };
  }
  if (!db) return { outcome: "blocked" };

  const claim = randomUUID();
  let reservation: Reservation;
  try {
    const { data, error } = await db.rpc("reserve_cancellation_test_email", {
      requested_authorization_id: authorizationId,
      requested_claim: claim,
      requested_recipient: allowedRecipient,
      requested_fixture_version: CANCELLATION_TEST_EMAIL_FIXTURE.version,
    });
    if (error) return { outcome: "outcome_unknown" };
    if (!Array.isArray(data) || data.length > 1) return { outcome: "outcome_unknown" };
    if (data.length === 0) return { outcome: "blocked" };
    reservation = data[0];
  } catch {
    return { outcome: "outcome_unknown" };
  }

  let providerMessageId: string | null = null;
  if (
    reservation?.recipient_email === allowedRecipient &&
    typeof reservation.expires_at === "string" &&
    Date.parse(reservation.expires_at) > Date.now() &&
    typeof reservation.sending_domain === "string" &&
    reservation.sending_domain === normalizeSendingDomain(reservation.sending_domain) &&
    getSendingDomainValidationError(reservation.sending_domain) === null
  ) {
    try {
      const result = await transport({
        from: `RevRecovery Test <cancellation-test@${reservation.sending_domain}>`,
        idempotencyKey: `${CANCELLATION_TEST_EMAIL_KEY_PREFIX}${authorizationId.toLowerCase()}`,
        subject: CANCELLATION_TEST_EMAIL_FIXTURE.subject,
        text: CANCELLATION_TEST_EMAIL_FIXTURE.text,
        to: [allowedRecipient],
      });
      if (
        typeof result?.providerMessageId === "string" &&
        CANCELLATION_TEST_EMAIL_PROVIDER_ID.test(result.providerMessageId)
      ) {
        providerMessageId = result.providerMessageId;
      }
    } catch {
      // A provider may have accepted a request even if no response arrived.
    }
  }

  try {
    const { data, error } = await db.rpc("complete_cancellation_test_email", {
      requested_authorization_id: authorizationId,
      requested_claim: claim,
      requested_provider_message_id: providerMessageId,
    });
    if (!error && data === true && providerMessageId) {
      return { outcome: "provider_accepted", providerMessageId };
    }
  } catch {
    // A reserved authorization cannot be reclaimed, even after a process crash.
  }
  return { outcome: "outcome_unknown" };
}
