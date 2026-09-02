import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import { Webhook } from "svix";
import {
  normalizeResendWebhookEvent,
  ResendWebhookValidationError,
  verifyAndNormalizeResendWebhook,
} from "../app/lib/server/resend-webhooks";

const secret = `whsec_${Buffer.from("revrecovery-resend-webhook-test-secret").toString("base64")}`;

function createSignedWebhook(type = "email.delivered") {
  const id = "msg_test_event_123";
  const timestamp = new Date();
  const payload = JSON.stringify({
    created_at: "2026-09-02T09:59:55.000Z",
    data: { email_id: "resend_email_123" },
    type,
  });
  const signature = new Webhook(secret).sign(id, timestamp, payload);
  const headers = new Headers({
    "svix-id": id,
    "svix-signature": signature,
    "svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
  });

  return { headers, payload };
}

describe("Resend webhook ingestion", () => {
  it("verifies the untouched payload and normalizes a delivery event", () => {
    const { headers, payload } = createSignedWebhook();

    expect(verifyAndNormalizeResendWebhook({ headers, payload, secret })).toEqual({
      eventType: "delivered",
      occurredAt: "2026-09-02T09:59:55.000Z",
      providerEventId: "msg_test_event_123",
      providerEventType: "email.delivered",
      providerMessageId: "resend_email_123",
    });
  });

  it("rejects a payload whose signature no longer matches", () => {
    const { headers, payload } = createSignedWebhook();

    expect(() =>
      verifyAndNormalizeResendWebhook({
        headers,
        payload: `${payload} `,
        secret,
      }),
    ).toThrow(ResendWebhookValidationError);
  });

  it("retains unknown provider event names without inventing a delivery outcome", () => {
    expect(
      normalizeResendWebhookEvent("event_unknown", {
        created_at: "2026-09-02T10:00:00.000Z",
        data: { email_id: "resend_email_unknown" },
        type: "email.future_event",
      }).eventType,
    ).toBe("unknown");
  });

  it("rejects events that do not identify a provider message", () => {
    expect(() =>
      normalizeResendWebhookEvent("event_invalid", {
        created_at: "2026-09-02T10:00:00.000Z",
        data: {},
        type: "email.delivered",
      }),
    ).toThrow(ResendWebhookValidationError);
  });
});
