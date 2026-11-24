import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Stripe Connect webhook token independence", () => {
  it("loads connection metadata without decrypting OAuth tokens", () => {
    const route = readFileSync(
      join(process.cwd(), "app/api/stripe/webhooks/connect/route.ts"),
      "utf8",
    );
    const connections = readFileSync(
      join(process.cwd(), "app/lib/server/stripe-connections.ts"),
      "utf8",
    );

    expect(route).toContain("getStripeConnectionWebhookMetadata");
    expect(route).not.toContain("getStripeConnectionForAccount");
    expect(connections).toContain(
      '.select("id, user_id, stripe_account_id, status, livemode")',
    );
  });
});
