import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../app/reset-password/recovery-session-bootstrap.tsx", import.meta.url),
  "utf8",
);

describe("fragment-based recovery session bootstrap", () => {
  it("requires recovery tokens, persists the session, and removes tokens from the URL", () => {
    expect(source).toContain('hashParams.get("access_token")');
    expect(source).toContain('hashParams.get("refresh_token")');
    expect(source).toContain('hashParams.get("type") === "recovery"');
    expect(source).toContain("supabase.auth.setSession");
    expect(source).toContain("window.history.replaceState");
  });
});
