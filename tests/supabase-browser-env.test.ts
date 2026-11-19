import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../app/lib/supabase/client.ts", import.meta.url),
  "utf8",
);

describe("Supabase browser environment configuration", () => {
  it("uses statically analyzable public environment references", () => {
    expect(source).toContain("process.env.NEXT_PUBLIC_SUPABASE_URL");
    expect(source).toContain("process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    expect(source).not.toContain("const rawValue = process.env[key]");
  });
});
