import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("operational alert boundaries", () => {
  it("captures cron failures while returning a stable public error", () => {
    const route = source("app/api/recovery/process/route.ts");

    expect(route).toContain('code: "recovery_cron_failed"');
    expect(route).toContain('{ error: "Recovery processing failed." }');
    expect(route).not.toContain("error instanceof Error ? error.message");
  });

  it("keeps expected webhook validation failures quiet and generic", () => {
    const resendRoute = source("app/api/resend/webhooks/route.ts");
    const stripeRoute = source("app/api/stripe/webhooks/connect/route.ts");

    expect(resendRoute).toContain('code: "resend_webhook_failed"');
    expect(resendRoute).toContain('{ error: "Invalid webhook." }');
    expect(stripeRoute).toContain(
      'code: "stripe_webhook_processing_failed"',
    );
    expect(stripeRoute).toContain('{ error: "Invalid Stripe signature." }');
    expect(stripeRoute).not.toContain("error instanceof Error ? error.message");
  });

  it("captures terminal and reconciliation states without adding a send path", () => {
    const recoveryDelivery = source(
      "app/lib/server/recovery-delivery.ts",
    );
    const notificationDelivery = source(
      "app/lib/server/recovery-notification-delivery.ts",
    );

    expect(recoveryDelivery).toContain(
      'code: "recovery_delivery_terminal_failed"',
    );
    expect(recoveryDelivery).toContain(
      '"recovery_delivery_unexpected_failed"',
    );
    expect(notificationDelivery).toContain(
      'code: "notification_reconciliation_required"',
    );
    expect(notificationDelivery).toContain("retryScheduled: false");
  });
});
