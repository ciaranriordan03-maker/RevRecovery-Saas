import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const recorder = readFileSync(
  join(process.cwd(), "app/lib/server/recovery-notification-events.ts"),
  "utf8",
);
const stripeWebhook = readFileSync(
  join(process.cwd(), "app/api/stripe/webhooks/connect/route.ts"),
  "utf8",
);
const sendingDomains = readFileSync(
  join(process.cwd(), "app/lib/server/recovery-sending-domains.ts"),
  "utf8",
);
const messageEvents = readFileSync(
  join(process.cwd(), "app/lib/server/recovery-message-events.ts"),
  "utf8",
);

describe("preview-only essential notification recording", () => {
  it("hard-codes recorded state and disabled delivery at the persistence boundary", () => {
    expect(recorder).toContain("delivery_enabled_snapshot: false");
    expect(recorder).toContain('status: "recorded"');
    expect(recorder).toContain("previewOnly: true");
    expect(recorder).not.toMatch(/sendEmail|resend\.emails|status:\s*["']queued["']/);
  });

  it("treats duplicate events as an expected cooldown outcome", () => {
    expect(recorder).toContain('error.code === "23505"');
    expect(recorder).toContain('return "duplicate"');
  });

  it("records only the three approved real-system conditions", () => {
    expect(stripeWebhook).toContain('ruleId: "webhook_failure"');
    expect(sendingDomains).toContain('ruleId: "sending_domain_failure"');
    expect(messageEvents).toContain('ruleId: "attention_digest"');
    expect(messageEvents).toContain("ATTENTION_DELIVERY_EVENTS");
  });

  it("keeps preview recording non-blocking for primary processing", () => {
    expect(recorder).toContain("must never interrupt Stripe, domain, or email processing");
    expect(recorder).toContain('return "failed"');
  });
});
