import { afterEach, describe, expect, it, vi } from "vitest";
import { isRecoveryCronAuthorized } from "../app/lib/server/cron-authorization";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("recovery processor authorization", () => {
  it("accepts Vercel's CRON_SECRET when a dedicated recovery secret also exists", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RECOVERY_EMAIL_CRON_SECRET", "dedicated-secret");
    vi.stubEnv("CRON_SECRET", "vercel-cron-secret");

    const request = new Request("https://revrecovery.io/api/recovery/process", {
      headers: { Authorization: "Bearer vercel-cron-secret" },
    });

    expect(isRecoveryCronAuthorized(request)).toBe(true);
  });

  it("accepts the dedicated recovery secret through the supported header", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RECOVERY_EMAIL_CRON_SECRET", "dedicated-secret");
    vi.stubEnv("CRON_SECRET", "vercel-cron-secret");

    const request = new Request("https://revrecovery.io/api/recovery/process", {
      headers: { "x-cron-secret": "dedicated-secret" },
    });

    expect(isRecoveryCronAuthorized(request)).toBe(true);
  });

  it("rejects missing and incorrect credentials in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RECOVERY_EMAIL_CRON_SECRET", "dedicated-secret");
    vi.stubEnv("CRON_SECRET", "vercel-cron-secret");

    expect(
      isRecoveryCronAuthorized(
        new Request("https://revrecovery.io/api/recovery/process"),
      ),
    ).toBe(false);
    expect(
      isRecoveryCronAuthorized(
        new Request("https://revrecovery.io/api/recovery/process", {
          headers: { Authorization: "Bearer incorrect" },
        }),
      ),
    ).toBe(false);
  });

  it("rejects all requests when cron secrets are missing in every environment", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RECOVERY_EMAIL_CRON_SECRET", "");
    vi.stubEnv("CRON_SECRET", "");

    expect(
      isRecoveryCronAuthorized(
        new Request("http://localhost:3000/api/recovery/process"),
      ),
    ).toBe(false);
  });
});
