import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routeSource = readFileSync(
  new URL("../app/api/retention/settings/route.ts", import.meta.url),
  "utf8",
);
const storeSource = readFileSync(
  new URL("../app/lib/server/retention-settings.ts", import.meta.url),
  "utf8",
);

describe("Phase 4 retention settings boundary", () => {
  it("requires authenticated reads and writes", () => {
    expect(routeSource.match(/status: 401/g)).toHaveLength(2);
    expect(routeSource).toContain("getRetentionSettingsForUser(userId)");
    expect(routeSource).toContain("updateRetentionSettingsForUser(userId, body)");
  });

  it("derives the Stripe connection from the authenticated tenant", () => {
    expect(storeSource).toContain('.eq("user_id", userId)');
    expect(storeSource).toContain('.eq("stripe_connection_id", connection.id)');
    expect(routeSource).not.toContain("stripeConnectionId?: unknown");
  });

  it("does not expose observation or Stripe mutation controls", () => {
    expect(routeSource).not.toContain("observationEnabled?: unknown");
    expect(storeSource).not.toContain("stripe.subscriptions");
    expect(storeSource).not.toContain("stripe.subscriptionItems");
  });
});
