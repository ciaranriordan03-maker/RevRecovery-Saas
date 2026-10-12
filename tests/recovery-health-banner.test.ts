import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../app/components/dashboard/recovery-health-banner.tsx", import.meta.url),
  "utf8",
);

describe("recovery health banner", () => {
  it("is explicitly read-only and does not claim notifications are active", () => {
    expect(source).toContain("Recovery health");
    expect(source).toContain("Read only");
    expect(source).toContain("Monitoring only");
    expect(source).toContain("has not sent a health notification");
  });
});
