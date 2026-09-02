import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const route = readFileSync(
  join(process.cwd(), "app/api/resend/webhooks/route.ts"),
  "utf8",
);

describe("Resend webhook route boundary", () => {
  it("verifies the untouched request body before persistence", () => {
    expect(route).toContain("await request.text()");
    expect(route).not.toContain("request.json(");
    expect(route.indexOf("verifyAndNormalizeResendWebhook")).toBeLessThan(
      route.lastIndexOf("persistRecoveryMessageEvent"),
    );
  });

  it("requires a dedicated signing secret and returns generic errors", () => {
    expect(route).toContain("RESEND_WEBHOOK_SECRET");
    expect(route).toContain('"Invalid webhook."');
    expect(route).toContain('"Webhook processing failed."');
  });
});
