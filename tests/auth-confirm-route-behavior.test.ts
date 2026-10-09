import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const exchangeCodeForSession = vi.fn();
const verifyOtp = vi.fn();
let cookieAdapter:
  | {
      getAll(): Array<{ name: string; value: string }>;
      setAll(
        cookies: Array<{
          name: string;
          options?: Record<string, unknown>;
          value: string;
        }>,
        headers: Record<string, string>,
      ): void;
    }
  | undefined;

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(
    (
      _url: string,
      _key: string,
      options: { cookies: typeof cookieAdapter },
    ) => {
      cookieAdapter = options.cookies;
      return {
        auth: {
          exchangeCodeForSession,
          verifyOtp,
        },
      };
    },
  ),
}));

vi.mock("../app/lib/supabase/env", () => ({
  getSupabasePublishableKey: () => "publishable-key",
  getSupabaseUrl: () => "https://project.supabase.co",
}));

import { GET } from "../app/auth/confirm/route";

describe("Supabase auth callback route behavior", () => {
  beforeEach(() => {
    cookieAdapter = undefined;
    exchangeCodeForSession.mockReset();
    verifyOtp.mockReset();
  });

  it("reads the verifier cookie and writes every session cookie to the redirect", async () => {
    exchangeCodeForSession.mockImplementation(async () => {
      expect(cookieAdapter?.getAll().map(({ name }) => name)).toEqual([
        "sb-project-auth-token-code-verifier",
      ]);
      cookieAdapter?.setAll(
        [
          {
            name: "sb-project-auth-token.0",
            options: { httpOnly: false, path: "/", sameSite: "lax", secure: true },
            value: "session-chunk-zero",
          },
          {
            name: "sb-project-auth-token.1",
            options: { httpOnly: false, path: "/", sameSite: "lax", secure: true },
            value: "session-chunk-one",
          },
        ],
        { "Cache-Control": "private, no-store" },
      );
      return { error: null };
    });

    const request = new NextRequest(
      "https://preview.example/auth/confirm?code=one-time-code&next=/reset-password",
      {
        headers: {
          cookie: "sb-project-auth-token-code-verifier=present",
        },
      },
    );
    const response = await GET(request);

    expect(exchangeCodeForSession).toHaveBeenCalledOnce();
    expect(exchangeCodeForSession).toHaveBeenCalledWith("one-time-code");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://preview.example/reset-password",
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.cookies.getAll().map(({ name }) => name)).toEqual([
      "sb-project-auth-token.0",
      "sb-project-auth-token.1",
    ]);
  });

  it("rejects an invalid or already-consumed code without setting session cookies", async () => {
    exchangeCodeForSession.mockResolvedValue({
      error: new Error("invalid authorization code"),
    });

    const response = await GET(
      new NextRequest("https://preview.example/auth/confirm?code=used-code"),
    );

    expect(exchangeCodeForSession).toHaveBeenCalledOnce();
    expect(response.headers.get("location")).toContain("/login?");
    expect(response.cookies.getAll()).toEqual([]);
  });
});
