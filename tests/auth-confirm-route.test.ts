import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routeSource = readFileSync(
  new URL("../app/auth/confirm/route.ts", import.meta.url),
  "utf8",
);

describe("Supabase auth callback", () => {
  it("writes exchanged session cookies onto the redirect response", () => {
    expect(routeSource).toContain(
      "const successResponse = NextResponse.redirect(redirectTo)",
    );
    expect(routeSource).toContain(
      "createAuthCallbackClient(request, successResponse)",
    );
    expect(routeSource).toContain("response.cookies.set(name, value, options)");
    expect(routeSource).toContain("response.headers.set(name, value)");
    expect(routeSource.match(/return successResponse/g)).toHaveLength(2);
  });
});
