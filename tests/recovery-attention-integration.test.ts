import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("recovery attention integration", () => {
  it("loads delivery facts within the tenant boundary", () => {
    const source = readFileSync(
      new URL("../app/lib/server/recovery-cases.ts", import.meta.url),
      "utf8",
    );
    expect(source).toContain("provider_delivery_status");
    expect(source).toContain('.eq("user_id", userId)');
    expect(source).toContain("getRecoveryAttentionFlags");
  });

  it("shows deterministic flags in both the queue and case detail", () => {
    const cases = readFileSync(
      new URL("../app/components/dashboard/cases-content.tsx", import.meta.url),
      "utf8",
    );
    const detail = readFileSync(
      new URL("../app/components/dashboard/case-detail-content.tsx", import.meta.url),
      "utf8",
    );
    expect(cases).toContain("item.attentionFlags");
    expect(detail).toContain("recoveryCase.attentionFlags");
    expect(detail).toContain("based only on the case and delivery facts");
  });
});
