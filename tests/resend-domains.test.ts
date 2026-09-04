import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createResendDomain,
  getResendDomain,
  ResendDomainError,
  verifyResendDomain,
} from "../app/lib/server/resend-domains";

const providerDomain = {
  id: "domain_123",
  name: "updates.example.com",
  records: [
    {
      name: "send.updates.example.com",
      priority: 10,
      record: "SPF",
      status: "pending",
      ttl: "Auto",
      type: "MX",
      value: "feedback-smtp.eu-west-1.amazonses.com",
    },
  ],
  status: "pending",
};

afterEach(() => {
  delete process.env.RESEND_API_KEY;
});
describe("Resend sending-domain adapter", () => {
  it("creates domains in the EU region without exposing the API key in the body", async () => {
    process.env.RESEND_API_KEY = "re_test_secret";
    const fetcher = vi.fn(async () => new Response(JSON.stringify(providerDomain), { status: 200 })) as unknown as typeof fetch;

    const result = await createResendDomain("updates.example.com", fetcher);

    expect(result).toEqual(providerDomain);
    const [url, init] = vi.mocked(fetcher).mock.calls[0];
    expect(url).toBe("https://api.resend.com/domains");
    expect(JSON.parse(String(init?.body))).toEqual({ name: "updates.example.com", region: "eu-west-1" });
    expect(String(init?.body)).not.toContain("re_test_secret");
  });

  it("retrieves status and starts verification through domain-scoped endpoints", async () => {
    process.env.RESEND_API_KEY = "re_test_secret";
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(providerDomain), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: providerDomain.id }), { status: 200 })) as unknown as typeof fetch;

    await expect(getResendDomain(providerDomain.id, fetcher)).resolves.toEqual(providerDomain);
    await expect(verifyResendDomain(providerDomain.id, fetcher)).resolves.toBeUndefined();
    expect(vi.mocked(fetcher).mock.calls.map(([url, init]) => [url, init?.method])).toEqual([
      ["https://api.resend.com/domains/domain_123", "GET"],
      ["https://api.resend.com/domains/domain_123/verify", "POST"],
    ]);
  });

  it("returns a sanitized provider error", async () => {
    process.env.RESEND_API_KEY = "re_test_secret";
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ message: "sensitive provider detail" }), { status: 422 })) as unknown as typeof fetch;

    await expect(createResendDomain("updates.example.com", fetcher)).rejects.toThrow(
      new ResendDomainError(),
    );
  });
});
