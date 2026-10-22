import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../app/lib/server/recovery-cases.ts", import.meta.url),
  "utf8",
);

describe("recovery case communication guidance", () => {
  it("maps existing decline guidance into the tenant-safe case DTO", () => {
    expect(source).toContain("customerAction: diagnostic.customerAction");
    expect(source).toContain("merchantAction: diagnostic.merchantAction");
    expect(source).toContain("retryGuidance: diagnostic.retryGuidance");
  });
});
