import { Buffer } from "node:buffer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Webhook } from "svix";
import { CANCELLATION_TEST_EMAIL_FIXTURE } from "../app/lib/cancellation-rescue/test-email-policy";
import {
  recordCancellationResendTestEvidence,
  reviewCancellationResendTestEvidence,
  type CancellationTestEmailEvidence,
} from "../app/lib/server/cancellation-rescue-resend-evidence";
import { createCancellationResendTestTransport } from "../app/lib/server/cancellation-rescue-resend-transport";
import { executeCancellationRescueTestEmail } from "../app/lib/server/cancellation-rescue-test-email";

const { admin, rpc } = vi.hoisted(() => ({ admin: vi.fn(), rpc: vi.fn() }));
vi.mock("../app/lib/supabase/admin", () => ({ createSupabaseAdminClient: admin }));

const authorizationId = "78000000-0000-0000-0000-000000000001";
const recipient = "test-inbox@example.invalid";
const sendingDomain = "mail.example.invalid";
const providerMessageId = "mock-resend-id";
const createdAt = "2099-12-01T09:55:02Z";
const reservedAt = "2099-12-01T09:55:00Z";
const expiresAt = "2099-12-01T10:00:00Z";
const { subject, text } = CANCELLATION_TEST_EMAIL_FIXTURE;
const from = `RevRecovery Test <cancellation-test@${sendingDomain}>`;
const envelope = { from, subject, text, to: [recipient] as const, idempotencyKey: `cancellation-test-email/${authorizationId}` };
const signingSecret = `whsec_${Buffer.from("cancellation-phase4b-synthetic-signing-key").toString("base64")}`;
const tags = { rr_flow: "cancellation_test", rr_test_authorization: authorizationId };

function sign(eventId: string, type: string, data: Record<string, unknown> = {}, at = "2099-12-01T10:01:00Z") {
  const payload = JSON.stringify({
    type,
    created_at: at,
    data: { email_id: providerMessageId, created_at: createdAt, from, to: [recipient], subject, tags, ...data },
  });
  const timestamp = new Date();
  return {
    payload,
    headers: new Headers({
      "svix-id": eventId,
      "svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
      "svix-signature": new Webhook(signingSecret).sign(eventId, timestamp, payload),
    }),
  };
}

const acceptedBinding = {
  authorizationId, recipient, sendingDomain, providerMessageId, reservedAt, expiresAt,
  status: "provider_accepted" as const,
};
const unknownBinding = { ...acceptedBinding, providerMessageId: null, status: "outcome_unknown" as const };
const transportWith = (request: typeof fetch) =>
  createCancellationResendTestTransport({ request, allowedRecipient: recipient, apiKey: "re_synthetic_not_a_real_key" });

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network disabled in mocked test")));
});

describe("durable signed cancellation test evidence boundary", () => {
  it("does not call storage for tampered or non-cancellation events", async () => {
    const event = sign("msg_storage", "email.delivered");
    const record = (input: ReturnType<typeof sign>) =>
      recordCancellationResendTestEvidence({ ...input, db: { rpc }, signingSecret });
    await expect(record({ ...event, payload: event.payload + " " })).resolves.toBe("invalid");
    await expect(record(sign("msg_storage", "email.delivered", { tags: null }))).resolves.toBe("unmatched");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("passes only validated envelope facts and respects durable conflict and replay results", async () => {
    const event = sign("msg_bounce_storage", "email.bounced", {
      bounce: { type: "Permanent", message: "private diagnostics" },
    });
    rpc.mockResolvedValueOnce({ data: "recorded" }).mockResolvedValueOnce({ data: "duplicate" })
      .mockResolvedValueOnce({ data: "conflict" });
    const record = () => recordCancellationResendTestEvidence({ ...event, db: { rpc }, signingSecret });
    await expect(record()).resolves.toBe("recorded");
    await expect(record()).resolves.toBe("duplicate");
    await expect(record()).resolves.toBe("conflict");
    expect(rpc).toHaveBeenNthCalledWith(1, "record_cancellation_test_email_evidence", {
      requested_authorization_id: authorizationId,
      requested_event_id: "msg_bounce_storage",
      requested_provider_message_id: providerMessageId,
      requested_recipient: recipient,
      requested_sending_domain: sendingDomain,
      requested_provider_created_at: "2099-12-01T09:55:02.000Z",
      requested_occurred_at: "2099-12-01T10:01:00.000Z",
      requested_event_kind: "bounced",
      requested_suppression_reason: "bounced",
    });
  });

  it("surfaces a sanitized storage error and never falls back to sending", async () => {
    rpc.mockRejectedValue(new Error("sensitive database error"));
    await expect(recordCancellationResendTestEvidence({
      ...sign("msg_storage", "email.sent"), db: { rpc }, signingSecret,
    })).rejects.toThrow("Cancellation test evidence storage is unavailable.");
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Phase 4B Resend transport", () => {
  it("makes exactly one mocked request with the reviewed fixture and stable dedupe key", async () => {
    const request = vi.fn().mockResolvedValue(Response.json({ id: providerMessageId }));
    const transport = transportWith(request);
    expect(await transport(envelope)).toEqual({ providerMessageId });
    expect(request).toHaveBeenCalledTimes(1);
    const [url, options] = request.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(options).toMatchObject({
      method: "POST", redirect: "error",
      headers: { "Idempotency-Key": envelope.idempotencyKey },
      signal: expect.any(AbortSignal),
    });
    expect(JSON.parse(options.body)).toEqual({
      from, to: [recipient], subject, text,
      tags: Object.entries(tags).map(([name, value]) => ({ name, value })),
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects altered copy, a different inbox, an invalid sender, and an unrelated key before dispatch", async () => {
    const request = vi.fn();
    const transport = transportWith(request);
    for (const invalid of [
      { ...envelope, text: "Substituted copy" },
      { ...envelope, to: ["different@example.invalid"] as const },
      { ...envelope, from: "another@example.invalid" },
      { ...envelope, idempotencyKey: "other/email" },
    ]) {
      await expect(transport(invalid)).rejects.toThrow("Cancellation test envelope is not eligible.");
    }
    expect(request).not.toHaveBeenCalled();
  });

  it.each([400, 409, 429, 500])("never retries an HTTP %d", async (status) => {
    const request = vi.fn().mockResolvedValue(Response.json({ detail: "private detail" }, { status }));
    await expect(transportWith(request)(envelope)).rejects.toThrow(
      "Cancellation test provider acceptance could not be verified.",
    );
    expect(request).toHaveBeenCalledTimes(1);
  });

  it.each([{}, { id: "bad id" }])("treats an invalid success response as unproven", async (body) => {
    const request = vi.fn().mockResolvedValue(Response.json(body));
    await expect(transportWith(request)(envelope)).rejects.toThrow("could not be verified");
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("leaves a timed-out attempt nonretryable and reconciles only verified evidence with both dependencies mocked", async () => {
    for (const [key, value] of [
      ["VERCEL_ENV", "preview"],
      ["VERCEL_TARGET_ENV", "preview"],
      ["NEXT_PUBLIC_SUPABASE_URL", "https://xkumdvlmmqyybavylibi.supabase.co"],
      ["CANCELLATION_TEST_EMAIL_ENABLED", "true"],
      ["CANCELLATION_TEST_EMAIL_ALLOWED_RECIPIENT", recipient],
    ]) vi.stubEnv(key, value);
    admin.mockReturnValue({ rpc });
    rpc.mockResolvedValueOnce({ data: [{ expires_at: expiresAt, recipient_email: recipient, sending_domain: sendingDomain }] })
      .mockResolvedValueOnce({ data: true })
      .mockResolvedValueOnce({ data: [] });
    const request = vi.fn().mockRejectedValue(new DOMException("Synthetic timeout", "TimeoutError"));
    const transport = transportWith(request);
    expect(await executeCancellationRescueTestEmail({ authorizationId, transport }))
      .toEqual({ outcome: "outcome_unknown" });
    expect(rpc).toHaveBeenNthCalledWith(2, "complete_cancellation_test_email", expect.objectContaining({
      requested_provider_message_id: null,
    }));
    const evidence = reviewCancellationResendTestEvidence({
      ...sign("msg_after_timeout", "email.delivered"),
      binding: unknownBinding, history: [], signingSecret,
    });
    expect(evidence).toMatchObject({ outcome: "recordable", deliveryStatus: "delivered" });
    expect(await executeCancellationRescueTestEmail({ authorizationId, transport })).toEqual({ outcome: "blocked" });
    expect(request).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("Phase 4B signed test evidence", () => {
  const review = (
    event: ReturnType<typeof sign>,
    history: readonly CancellationTestEmailEvidence[] = [],
    binding: Parameters<typeof reviewCancellationResendTestEvidence>[0]["binding"] = acceptedBinding,
  ) => reviewCancellationResendTestEvidence({ ...event, binding, history, signingSecret });

  it("requires a valid signature on the raw body and bounds the accepted payload", () => {
    const event = sign("msg_test", "email.delivered");
    expect(review({ ...event, payload: event.payload + " " })).toEqual({ outcome: "invalid" });
    expect(review({ ...event, payload: "x".repeat(32_769) })).toEqual({ outcome: "invalid" });
  });

  it.each([
    { tags: null },
    { tags: { ...tags, rr_test_authorization: "78000000-0000-0000-0000-000000000009" } },
    { to: [recipient, "another@example.invalid"] },
    { to: ["wrong@example.invalid"] },
    { from: "different@mail.example.invalid" },
    { subject: "Unrelated" },
    { created_at: "2099-12-01T09:54:59Z" },
    { created_at: "2099-12-01T10:00:11Z" },
  ])("ignores unrelated or out-of-window signed messages: %j", (data) => {
    expect(review(sign("msg_test", "email.delivered", data))).toEqual({ outcome: "unmatched" });
  });

  it("treats provider sent as different from delivered and rejects mismatched provider ids", () => {
    expect(review(sign("msg_sent", "email.sent")))
      .toMatchObject({ outcome: "recordable", deliveryStatus: "sent", suppressionReason: null });
    expect(review(sign("msg_other", "email.delivered", { email_id: "foreign-id" })))
      .toEqual({ outcome: "conflict" });
  });

  it("deduplicates a replay and flags changed facts or a second provider id for the same attempt", () => {
    const event = sign("msg_test", "email.delivered");
    const first = review(event, [], unknownBinding);
    expect(first.outcome).toBe("recordable");
    if (first.outcome !== "recordable") throw new Error("Expected signed result");
    expect(review(event, [first.evidence], unknownBinding)).toEqual({ outcome: "duplicate" });
    expect(review(sign("msg_test", "email.failed"), [first.evidence], unknownBinding)).toEqual({ outcome: "conflict" });
    expect(review(sign("msg_other", "email.sent", { email_id: "second-id" }), [first.evidence], unknownBinding))
      .toEqual({ outcome: "conflict" });
  });

  it.each([
    ["email.bounced", "Permanent", "bounced"],
    ["email.bounced", "Transient", null],
    ["email.complained", null, "complained"],
    ["email.suppressed", null, "suppressed"],
  ])("projects %s %s without letting a later event clear suppression", (type, bounceType, reason) => {
    const blocked = review(sign("msg_stop", type, {
      bounce: { type: bounceType, message: "Sensitive diagnostic must not be persisted" },
    }));
    expect(blocked).toMatchObject({ outcome: "recordable", suppressionReason: reason });
    if (blocked.outcome !== "recordable") throw new Error("Expected signed result");
    expect(JSON.stringify(blocked.evidence)).not.toContain("Sensitive diagnostic");
    expect(JSON.stringify(blocked.evidence)).not.toContain(recipient);
    const late = review(sign("msg_delivered", "email.delivered"), [blocked.evidence]);
    expect(late).toMatchObject({
      outcome: "recordable", suppressionReason: reason, deliveryStatus: reason ?? "delivered",
    });
  });
});
