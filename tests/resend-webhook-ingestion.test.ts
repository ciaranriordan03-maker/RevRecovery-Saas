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
      metadata: {},
      occurredAt: "2026-09-02T09:59:55.000Z",
      providerEventId: "msg_test_event_123",
      providerEventType: "email.delivered",
      providerMessageId: "resend_email_123",
      shouldSuppressRecipient: false,
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

  it("suppresses a recipient after a permanent bounce and stores only safe bounce facts", () => {
    expect(
      normalizeResendWebhookEvent("event_hard_bounce", {
        created_at: "2026-09-02T10:00:00.000Z",
        data: {
          bounce: {
            message: "Sensitive provider diagnostic that must not be persisted",
            subType: "General",
            type: "Permanent",
          },
          email_id: "resend_email_hard_bounce",
          to: ["customer@example.com"],
        },
        type: "email.bounced",
      }),
    ).toEqual({
      eventType: "bounced",
      metadata: { bounceSubType: "General", bounceType: "Permanent" },
      occurredAt: "2026-09-02T10:00:00.000Z",
      providerEventId: "event_hard_bounce",
      providerEventType: "email.bounced",
      providerMessageId: "resend_email_hard_bounce",
      shouldSuppressRecipient: true,
    });
  });

  it("does not suppress a recipient after a transient bounce", () => {
    const event = normalizeResendWebhookEvent("event_soft_bounce", {
      created_at: "2026-09-02T10:00:00.000Z",
      data: {
        bounce: { subType: "MailboxFull", type: "Transient" },
        email_id: "resend_email_soft_bounce",
      },
      type: "email.bounced",
    });

    expect(event.metadata).toEqual({
      bounceSubType: "MailboxFull",
      bounceType: "Transient",
    });
    expect(event.shouldSuppressRecipient).toBe(false);
  });

  it.each([
    ["email.complained", "complained"],
    ["email.suppressed", "suppressed"],
  ])("suppresses a recipient for %s", (providerType, eventType) => {
    const event = normalizeResendWebhookEvent(`event_${eventType}`, {
      created_at: "2026-09-02T10:00:00.000Z",
      data: {
        email_id: `resend_email_${eventType}`,
        suppressed: { type: "SuppressionList" },
      },
      type: providerType,
    });

    expect(event.eventType).toBe(eventType);
    expect(event.shouldSuppressRecipient).toBe(true);
  });
});
