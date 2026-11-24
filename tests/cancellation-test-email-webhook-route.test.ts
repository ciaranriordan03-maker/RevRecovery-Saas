import { NextRequest } from "next/server";
import { Webhook } from "svix";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/cancellation-rescue/test/email-webhook/route";
import {
  CANCELLATION_TEST_EMAIL_FIXTURE,
  CANCELLATION_TEST_EMAIL_WEBHOOK_PATH,
} from "../app/lib/cancellation-rescue/test-email-policy";
import { proxy } from "../proxy";

const { admin, rpc, updateSession } = vi.hoisted(() => ({
  admin: vi.fn(), rpc: vi.fn(), updateSession: vi.fn(),
}));
vi.mock("../app/lib/supabase/admin", () => ({ createSupabaseAdminClient: admin }));
vi.mock("../app/lib/supabase/proxy", () => ({ updateSession }));

const devUrl = "https://xkumdvlmmqyybavylibi.supabase.co";
const url = "http://localhost" + CANCELLATION_TEST_EMAIL_WEBHOOK_PATH;
const secret = "whsec_" + Buffer.from("offline-cancellation-fixture-secret").toString("base64");
const unrelatedSecret = "whsec_" + Buffer.from("offline-unrelated-fixture-secret").toString("base64");
const authorization = "78000000-0000-0000-0000-000000000001";
const eventBody = (type = "email.delivered", tags: unknown = {
  rr_flow: "cancellation_test", rr_test_authorization: authorization,
}) => JSON.stringify({
  type,
  created_at: "2026-11-24T17:53:00Z",
  data: {
    email_id: "fake-test-email-id",
    created_at: "2026-11-24T17:50:00Z",
    from: "cancellation-test@mail.example.invalid",
    to: ["test-inbox@example.invalid"],
    subject: CANCELLATION_TEST_EMAIL_FIXTURE.subject,
    tags,
    bounce: { type: "Permanent", message: "synthetic diagnostic café" },
  },
}, null, 2);

function signedHeaders(body: string, key = secret, date = new Date()) {
  const eventId = "msg_synthetic_route";
  return new Headers({
    "content-type": "application/json; charset=utf-8",
    "svix-id": eventId,
    "svix-timestamp": String(Math.floor(date.getTime() / 1000)),
    "svix-signature": new Webhook(key).sign(eventId, date, body),
  });
}
const request = (body = eventBody(), headers = signedHeaders(body)) =>
  new Request(url, { method: "POST", body, headers });

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network not allowed in local route tests")));
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", devUrl);
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("VERCEL_TARGET_ENV", "preview");
  vi.stubEnv("CANCELLATION_TEST_EMAIL_WEBHOOK_ENABLED", "true");
  vi.stubEnv("CANCELLATION_TEST_EMAIL_WEBHOOK_SECRET", secret);
  vi.stubEnv("RESEND_WEBHOOK_SECRET", unrelatedSecret);
  vi.stubEnv("CANCELLATION_TEST_EMAIL_ENABLED", "false");
  admin.mockReturnValue({ rpc });
  rpc.mockResolvedValue({ data: "recorded" });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("receive-only cancellation test email webhook", () => {
  it.each([
    ["CANCELLATION_TEST_EMAIL_WEBHOOK_ENABLED", undefined],
    ["CANCELLATION_TEST_EMAIL_WEBHOOK_SECRET", undefined],
    ["CANCELLATION_TEST_EMAIL_WEBHOOK_SECRET", unrelatedSecret],
    ["VERCEL_ENV", "production"],
    ["VERCEL_TARGET_ENV", "production"],
    ["NEXT_PUBLIC_SUPABASE_URL", "https://keddusmowpdqrxooveiz.supabase.co"],
  ])("fails closed for %s = %s", async (key, value) => {
    vi.stubEnv(key, value);
    const response = await POST(request());
    expect(response.status).toBe(404);
    expect(admin).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("requires a fresh signature on the exact raw bytes before storage", async () => {
    const raw = eventBody();
    for (const attempt of [
      request(raw + " ", signedHeaders(raw)),
      request(raw, signedHeaders(raw, unrelatedSecret)),
      request(raw, signedHeaders(raw, secret, new Date(Date.now() - 3_600_000))),
      request(raw, new Headers({ "content-type": "application/json" })),
    ]) {
      const response = await POST(attempt);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ received: false });
    }
    expect(admin).not.toHaveBeenCalled();
  });

  it("caps both declared and streamed payloads and accepts only JSON", async () => {
    const raw = eventBody();
    const headers = signedHeaders(raw);
    headers.set("content-length", "32769");
    expect((await POST(request(raw, headers))).status).toBe(413);
    expect((await POST(request("é".repeat(16_385)))).status).toBe(413);
    headers.delete("content-length");
    headers.set("content-type", "text/plain");
    expect((await POST(request(raw, headers))).status).toBe(415);
    expect(admin).not.toHaveBeenCalled();
  });

  it.each([
    ["email.delivered", "delivered", null],
    ["email.bounced", "bounced", "bounced"],
    ["email.complained", "complained", "complained"],
  ])("receives a synthetic signed %s without enabling sending", async (type, kind, reason) => {
    const response = await POST(request(eventBody(type)));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ received: true });
    expect(rpc).toHaveBeenCalledExactlyOnceWith("record_cancellation_test_email_evidence", {
      requested_authorization_id: authorization,
      requested_event_id: "msg_synthetic_route",
      requested_provider_message_id: "fake-test-email-id",
      requested_recipient: "test-inbox@example.invalid",
      requested_sending_domain: "mail.example.invalid",
      requested_provider_created_at: "2026-11-24T17:50:00.000Z",
      requested_occurred_at: "2026-11-24T17:53:00.000Z",
      requested_event_kind: kind,
      requested_suppression_reason: reason,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("ignores unrelated signed traffic and acknowledges replays and conflicts identically", async () => {
    const ignored = await POST(request(eventBody("email.delivered", null)));
    expect(ignored.status).toBe(200);
    expect(admin).not.toHaveBeenCalled();
    for (const outcome of ["recorded", "duplicate", "conflict", "unmatched"]) {
      rpc.mockResolvedValueOnce({ data: outcome });
      const response = await POST(request());
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ received: true });
    }
    expect(rpc).toHaveBeenCalledTimes(4);
  });

  it("returns a sanitized retryable response on storage failure without dispatching or retrying", async () => {
    rpc.mockRejectedValueOnce(new Error("private RPC information"));
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ received: false });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("bypasses cookie authentication only for the exact signed webhook path", async () => {
    const inbound = new NextRequest(url);
    expect((await proxy(inbound)).status).toBe(200);
    expect(updateSession).not.toHaveBeenCalled();
    const existing = new NextRequest("http://localhost/api/resend/webhooks");
    await proxy(existing);
    expect(updateSession).toHaveBeenCalledExactlyOnceWith(existing);
  });
});
