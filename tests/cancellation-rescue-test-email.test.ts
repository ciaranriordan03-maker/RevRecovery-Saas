import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isCancellationTestEmailDevelopment,
  normalizeCancellationTestEmailRecipient,
} from "../app/lib/cancellation-rescue/test-email-policy";
import { executeCancellationRescueTestEmail } from "../app/lib/server/cancellation-rescue-test-email";

const { admin, rpc } = vi.hoisted(() => ({ admin: vi.fn(), rpc: vi.fn() }));
vi.mock("../app/lib/supabase/admin", () => ({ createSupabaseAdminClient: admin }));

const authorizationId = "78000000-0000-0000-0000-000000000001";
const recipient = "operator+test@example.invalid";
const developmentUrl = "https://xkumdvlmmqyybavylibi.supabase.co";
const reservation = {
  expires_at: "2099-12-01T10:00:00Z",
  recipient_email: recipient,
  sending_domain: "mail.example.invalid",
};

const execute = (transport = vi.fn().mockResolvedValue({ providerMessageId: "provider-123" })) =>
  executeCancellationRescueTestEmail({ authorizationId, transport });

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("VERCEL_TARGET_ENV", "preview");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", developmentUrl);
  vi.stubEnv("CANCELLATION_TEST_EMAIL_ALLOWED_RECIPIENT", recipient);
  vi.stubEnv("CANCELLATION_TEST_EMAIL_ENABLED", "true");
  admin.mockReturnValue({ rpc });
  rpc.mockResolvedValueOnce({ data: [reservation] }).mockResolvedValue({ data: true });
});
afterEach(() => vi.unstubAllEnvs());

describe("Phase 4A controlled cancellation test email", () => {
  it.each([
    ["CANCELLATION_TEST_EMAIL_ENABLED", undefined],
    ["CANCELLATION_TEST_EMAIL_ENABLED", "TRUE"],
    ["CANCELLATION_TEST_EMAIL_ALLOWED_RECIPIENT", undefined],
    ["CANCELLATION_TEST_EMAIL_ALLOWED_RECIPIENT", "one@example.invalid, two@example.invalid"],
    ["VERCEL_ENV", "production"],
    ["VERCEL_TARGET_ENV", "production"],
    ["NEXT_PUBLIC_SUPABASE_URL", "https://keddusmowpdqrxooveiz.supabase.co"],
  ])("blocks before storage or transport when %s is %s", async (key, value) => {
    vi.stubEnv(key, value);
    const transport = vi.fn();
    expect(await execute(transport)).toEqual({ outcome: "blocked" });
    expect(admin).not.toHaveBeenCalled();
    expect(transport).not.toHaveBeenCalled();
  });

  it("blocks when no transport is attached or the authorization ID is invalid", async () => {
    expect(await executeCancellationRescueTestEmail({ authorizationId })).toEqual({ outcome: "blocked" });
    expect(await executeCancellationRescueTestEmail({
      authorizationId: "not-an-id",
      transport: vi.fn(),
    })).toEqual({ outcome: "blocked" });
    expect(admin).not.toHaveBeenCalled();
  });

  it("uses only the approved mailbox and a fixed, link-free, clearly labeled test fixture", async () => {
    const transport = vi.fn().mockResolvedValue({ providerMessageId: "provider-123" });
    expect(await execute(transport)).toEqual({
      outcome: "provider_accepted", providerMessageId: "provider-123",
    });
    expect(rpc).toHaveBeenNthCalledWith(1, "reserve_cancellation_test_email", {
      requested_authorization_id: authorizationId,
      requested_claim: expect.any(String),
      requested_recipient: recipient,
      requested_fixture_version: "cancellation_test_v1",
    });
    expect(transport).toHaveBeenCalledTimes(1);
    const envelope = transport.mock.calls[0][0];
    expect(envelope).toEqual({
      from: "RevRecovery Test <cancellation-test@mail.example.invalid>",
      idempotencyKey: `cancellation-test-email/${authorizationId}`,
      subject: expect.stringMatching(/^\[TEST\]/),
      text: expect.stringContaining("It is not a customer message"),
      to: [recipient],
    });
    expect(envelope.text).not.toMatch(/https?:|rrt_|\{\{/i);
    expect(rpc).toHaveBeenNthCalledWith(2, "complete_cancellation_test_email", {
      requested_authorization_id: authorizationId,
      requested_claim: rpc.mock.calls[0][1].requested_claim,
      requested_provider_message_id: "provider-123",
    });
  });

  it("does not call a transport when the database declines or cannot prove reservation", async () => {
    const transport = vi.fn();
    rpc.mockReset().mockResolvedValueOnce({ data: [] }).mockRejectedValueOnce(new Error("unavailable"));
    expect(await execute(transport)).toEqual({ outcome: "blocked" });
    expect(await execute(transport)).toEqual({ outcome: "outcome_unknown" });
    expect(transport).not.toHaveBeenCalled();
  });

  it.each([
    { ...reservation, recipient_email: "somebody-else@example.invalid" },
    { ...reservation, sending_domain: "bad.test\nBcc: user@example.invalid" },
    { ...reservation, expires_at: "2000-01-01T00:00:00Z" },
  ])("does not send an expired, mismatched, or malformed reservation", async (malformed) => {
    rpc.mockReset().mockResolvedValueOnce({ data: [malformed] }).mockResolvedValue({ data: true });
    const transport = vi.fn();
    expect(await execute(transport)).toEqual({ outcome: "outcome_unknown" });
    expect(transport).not.toHaveBeenCalled();
    expect(rpc.mock.calls[1][1].requested_provider_message_id).toBeNull();
  });

  it("records an ambiguous transport result without retrying, even on concurrent replay", async () => {
    let consumed = false;
    rpc.mockReset().mockImplementation(async (name) => {
      if (name !== "reserve_cancellation_test_email") return { data: true };
      if (consumed) return { data: [] };
      consumed = true;
      return { data: [reservation] };
    });
    const transport = vi.fn().mockRejectedValue(new Error("timeout after dispatch"));
    expect(await Promise.all([execute(transport), execute(transport)])).toEqual([
      { outcome: "outcome_unknown" }, { outcome: "blocked" },
    ]);
    expect(transport).toHaveBeenCalledTimes(1);
    expect(rpc.mock.lastCall?.[1].requested_provider_message_id).toBeNull();
  });

  it("does not claim success when acceptance cannot be persisted", async () => {
    rpc.mockReset().mockResolvedValueOnce({ data: [reservation] }).mockResolvedValueOnce({ data: false });
    const transport = vi.fn().mockResolvedValue({ providerMessageId: "provider-123" });
    expect(await execute(transport)).toEqual({ outcome: "outcome_unknown" });
    expect(transport).toHaveBeenCalledTimes(1);
  });
});

describe("Phase 4A isolation contract", () => {
  it("requires the exact HTTPS Development host and only one address", () => {
    expect(isCancellationTestEmailDevelopment({ supabaseUrl: developmentUrl })).toBe(true);
    for (const url of [`${developmentUrl}.example.invalid`, `${developmentUrl}/extra`, null]) {
      expect(isCancellationTestEmailDevelopment({ supabaseUrl: url })).toBe(false);
    }
    expect(normalizeCancellationTestEmailRecipient(" Operator+Test@Example.Invalid ")).toBe(recipient);
    expect(normalizeCancellationTestEmailRecipient("Operator <operator@example.invalid>")).toBeNull();
  });

  it("ships no provider transport or link and preserves service-only database access", () => {
    const service = readFileSync("app/lib/server/cancellation-rescue-test-email.ts", "utf8");
    const migration = readFileSync(
      "supabase/migrations/20261124000200_cancellation_rescue_phase4a_test_email.sql", "utf8",
    );
    expect(service).toContain('import "server-only"');
    expect(service).not.toMatch(/fetch\(|https?:\/\/|RESEND_API_KEY|stripe\.subscriptions/);
    expect(migration).toContain("test_email_enabled boolean not null default false");
    expect(migration).toContain("cancellation_case_id uuid not null unique");
    expect(migration).toContain("revoke all on function");
    expect(migration).not.toMatch(/grant .* to (anon|authenticated)/i);
  });
});
