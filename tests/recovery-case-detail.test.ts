import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("recovery case detail route", () => {
  it("loads a case by both tenant and case id", () => {
    const source = readFileSync(
      new URL("../app/lib/server/recovery-cases.ts", import.meta.url),
      "utf8",
    );
    expect(source).toContain("getRecoveryCaseById");
    expect(source).toContain('.eq("user_id", userId)');
    expect(source).toContain('.eq("id", failedPaymentId)');
  });

  it("rejects invalid or inaccessible identifiers with a not-found response", () => {
    const source = readFileSync(
      new URL("../app/dashboard/cases/[id]/page.tsx", import.meta.url),
      "utf8",
    );
    expect(source).toContain("UUID_PATTERN.test(id)");
    expect(source.match(/notFound\(\)/g)).toHaveLength(2);
  });

  it("links case rows to the tenant-protected detail route", () => {
    const source = readFileSync(
      new URL("../app/components/dashboard/cases-content.tsx", import.meta.url),
      "utf8",
    );
    expect(source).toContain("`/dashboard/cases/${item.id}`");
  });
});
