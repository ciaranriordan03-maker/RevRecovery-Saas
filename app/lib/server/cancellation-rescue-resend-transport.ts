import "server-only";

import {
  CANCELLATION_TEST_EMAIL_FIXTURE,
  CANCELLATION_TEST_EMAIL_FLOW,
  CANCELLATION_TEST_EMAIL_KEY_PREFIX,
  CANCELLATION_TEST_EMAIL_PROVIDER_ID,
  CANCELLATION_TEST_EMAIL_TIMEOUT_MS,
  CANCELLATION_TEST_EMAIL_UUID,
  normalizeCancellationTestEmailRecipient,
} from "../cancellation-rescue/test-email-policy";
import { getSendingDomainValidationError, normalizeSendingDomain } from "../email/sending-domain";
import type { TestEmailTransport } from "./cancellation-rescue-test-email";

const RESEND_EMAILS_ENDPOINT = "https://api.resend.com/emails";

/**
 * Dormant adapter. A request client and dedicated credential must be injected.
 * There is no default fetch, env credential lookup, operator route, or retry.
 */
export function createCancellationResendTestTransport({
  allowedRecipient,
  apiKey,
  request,
}: {
  allowedRecipient: string;
  apiKey: string;
  request: typeof fetch;
}): TestEmailTransport {
  const recipient = normalizeCancellationTestEmailRecipient(allowedRecipient);
  if (!recipient || !/^re_[a-zA-Z0-9_-]+$/.test(apiKey)) {
    throw new Error("Cancellation test transport is not configured.");
  }

  return async ({ from, idempotencyKey, subject, text, to }) => {
    const domain = /^RevRecovery Test <cancellation-test@([a-z0-9.-]+)>$/.exec(from)?.[1];
    const authorizationId = idempotencyKey.slice(CANCELLATION_TEST_EMAIL_KEY_PREFIX.length);
    if (
      !domain || normalizeSendingDomain(domain) !== domain || getSendingDomainValidationError(domain) ||
      to.length !== 1 || to[0] !== recipient ||
      !idempotencyKey.startsWith(CANCELLATION_TEST_EMAIL_KEY_PREFIX) ||
      !CANCELLATION_TEST_EMAIL_UUID.test(authorizationId) ||
      subject !== CANCELLATION_TEST_EMAIL_FIXTURE.subject ||
      text !== CANCELLATION_TEST_EMAIL_FIXTURE.text
    ) throw new Error("Cancellation test envelope is not eligible.");

    try {
      const response = await request(RESEND_EMAILS_ENDPOINT, {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(CANCELLATION_TEST_EMAIL_TIMEOUT_MS),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          from, subject, text, to: [recipient],
          tags: [
            { name: "rr_flow", value: CANCELLATION_TEST_EMAIL_FLOW },
            { name: "rr_test_authorization", value: authorizationId },
          ],
        }),
      });
      if (response.ok) {
        const body: unknown = await response.json();
        if (body && typeof body === "object" && "id" in body &&
          typeof body.id === "string" && CANCELLATION_TEST_EMAIL_PROVIDER_ID.test(body.id)) {
          return { providerMessageId: body.id };
        }
      }
    } catch {
      // Do not expose provider bodies, transport errors, recipients, or credentials.
    }
    // A rejection or ambiguous response is deliberately nonretryable in this drill.
    throw new Error("Cancellation test provider acceptance could not be verified.");
  };
}
