import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildPasswordRecoveryCallbackPath } from "../app/lib/auth-callback";

const homeSource = readFileSync(
  new URL("../app/page.tsx", import.meta.url),
  "utf8",
);

describe("password recovery callback routing", () => {
  it("forwards PKCE codes from the site root to the cookie-capable callback route", () => {
    expect(buildPasswordRecoveryCallbackPath({ code: "one-time-code" })).toBe(
      "/auth/confirm?code=one-time-code&next=%2Freset-password",
    );
  });

  it("forwards token hashes and preserves the recovery type", () => {
    expect(
      buildPasswordRecoveryCallbackPath({
        token_hash: "one-time-token-hash",
        type: "recovery",
      }),
    ).toBe(
      "/auth/confirm?token_hash=one-time-token-hash&type=recovery&next=%2Freset-password",
    );
  });

  it("does not create an auth callback for an ordinary home-page request", () => {
    expect(buildPasswordRecoveryCallbackPath({})).toBeNull();
  });

  it("keeps root recovery callbacks while rendering the public homepage", () => {
    expect(homeSource).toContain("buildPasswordRecoveryCallbackPath");
    expect(homeSource).toContain("redirect(callbackPath)");
    expect(homeSource).toContain("<MarketingPage />");
  });
});
