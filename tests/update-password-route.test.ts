import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routeSource = readFileSync(
  new URL("../app/api/auth/update-password/route.ts", import.meta.url),
  "utf8",
);

const pageSource = readFileSync(
  new URL("../app/reset-password/page.tsx", import.meta.url),
  "utf8",
);

describe("password reset submission", () => {
  it("posts to a same-origin route that reads recovery cookies", () => {
    expect(pageSource).toContain('action="/api/auth/update-password"');
    expect(pageSource).toContain('method="post"');
    expect(routeSource).toContain("return request.cookies.getAll()");
    expect(routeSource).toContain("supabase.auth.updateUser({ password })");
  });

  it("validates the request and forwards refreshed auth cookies", () => {
    expect(routeSource).toContain("isSameOrigin(request)");
    expect(routeSource).toContain("password.length < 8");
    expect(routeSource).toContain("password !== confirmPassword");
    expect(routeSource).toContain("successResponse.cookies.set(name, value, options)");
    expect(routeSource).toContain("successResponse.headers.set(name, value)");
  });
});
