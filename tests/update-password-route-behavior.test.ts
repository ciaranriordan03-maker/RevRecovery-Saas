import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const updateUser = vi.fn();
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
      return { auth: { updateUser } };
    },
  ),
}));

vi.mock("../app/lib/supabase/env", () => ({
  getSupabasePublishableKey: () => "publishable-key",
  getSupabaseUrl: () => "https://project.supabase.co",
}));

import { POST } from "../app/api/auth/update-password/route";

function passwordRequest({
  confirmPassword = "new-password",
  cookie = "sb-project-auth-token.0=session",
  origin = "https://preview.example",
  password = "new-password",
} = {}) {
  return new NextRequest("https://preview.example/api/auth/update-password", {
    body: new URLSearchParams({
      confirm_password: confirmPassword,
      password,
    }),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie,
      origin,
    },
    method: "POST",
  });
}

describe("password update route behavior", () => {
  beforeEach(() => {
    cookieAdapter = undefined;
    updateUser.mockReset();
  });

  it("reads the recovery session and updates the password", async () => {
    updateUser.mockImplementation(async ({ password }: { password: string }) => {
      expect(password).toBe("new-password");
      expect(cookieAdapter?.getAll().map(({ name }) => name)).toEqual([
        "sb-project-auth-token.0",
      ]);
      return { error: null };
    });

    const response = await POST(passwordRequest());

    expect(updateUser).toHaveBeenCalledOnce();
    expect(response.status).toBe(303);
    const location = response.headers.get("location") ?? "";
    expect(location).toContain("/login?");
    expect(location).toContain("Password+updated");
    expect(location).not.toContain("new-password");
  });

  it("returns an actionable message when the recovery session is missing", async () => {
    updateUser.mockResolvedValue({ error: new Error("Auth session missing!") });

    const response = await POST(passwordRequest({ cookie: "" }));

    expect(response.headers.get("location")).toContain(
      "That+reset+session+is+missing+or+expired",
    );
  });

  it("rejects mismatched passwords before contacting Supabase", async () => {
    const response = await POST(
      passwordRequest({ confirmPassword: "different-password" }),
    );

    expect(updateUser).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toContain("Passwords+do+not+match");
  });

  it("rejects cross-origin submissions before contacting Supabase", async () => {
    const response = await POST(
      passwordRequest({ origin: "https://attacker.example" }),
    );

    expect(updateUser).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toContain("request+was+rejected");
  });
});
