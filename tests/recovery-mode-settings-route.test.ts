import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routeSource = readFileSync(
  new URL("../app/api/recovery/settings/route.ts", import.meta.url),
  "utf8",
);
const storeSource = readFileSync(
  new URL("../app/lib/server/recovery-account-settings.ts", import.meta.url),
  "utf8",
);

describe("recovery mode settings boundary", () => {
  it("requires an authenticated user for reads and writes", () => {
    expect(routeSource).toContain("getAuthenticatedUserId");
    expect(routeSource.match(/status: 401/g)).toHaveLength(2);
    expect(routeSource).toContain("getRecoveryModeSettingsForUser(userId)");
    expect(routeSource).toContain("updateRecoveryModeSettingsForUser(userId, body)");
  });

  it("derives the Stripe connection from the authenticated user", () => {
    expect(storeSource).toContain('.eq("user_id", userId)');
    expect(storeSource).toContain('.eq("stripe_connection_id", connection.id)');
    expect(routeSource).not.toContain("stripeAccountId?: unknown");
    expect(routeSource).not.toContain("stripeConnectionId?: unknown");
  });

  it("keeps the legacy delivery behavior read-only before migration", () => {
    expect(storeSource).toContain('mode: "live"');
    expect(storeSource).toContain('source: "legacy_fallback"');
    expect(storeSource).toContain('editable: runtime.source === "persisted"');
  });

  it("persists pause metadata without canceling recovery messages", () => {
    expect(storeSource).toContain('paused_at: input.mode === "paused" ? now : null');
    expect(storeSource).toContain(
      'paused_reason: input.mode === "paused" ? "merchant_paused" : null',
    );
    expect(storeSource).not.toContain("recovery_messages");
  });
});
