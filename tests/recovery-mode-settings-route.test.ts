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
const scheduleMigrationSource = readFileSync(
  new URL(
    "../supabase/migrations/20260831000600_phase0_recovery_schedules.sql",
    import.meta.url,
  ),
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
    expect(storeSource).toContain("requested_connection_id: connection.id");
    expect(routeSource).not.toContain("stripeAccountId?: unknown");
    expect(routeSource).not.toContain("stripeConnectionId?: unknown");
  });

  it("keeps the legacy delivery behavior read-only before migration", () => {
    expect(storeSource).toContain('mode: "live"');
    expect(storeSource).toContain('source: "legacy_fallback"');
    expect(storeSource).toContain('editable: runtime.source === "persisted"');
  });

  it("persists pause metadata without canceling recovery messages", () => {
    expect(storeSource).toContain("requested_mode: input.mode");
    expect(scheduleMigrationSource).toContain(
      "paused_at = case when requested_mode = 'paused'",
    );
    expect(scheduleMigrationSource).toContain(
      "paused_reason = case when requested_mode = 'paused'",
    );
    expect(storeSource).not.toContain("recovery_messages");
  });

  it("validates and publishes the recovery schedule for the authenticated connection", () => {
    expect(routeSource).toContain("scheduleId?: unknown");
    expect(routeSource).toContain("timezone?: unknown");
    expect(storeSource).toContain("isRecoveryScheduleId(input.scheduleId)");
    expect(storeSource).toContain("isValidTimezone(input.timezone)");
    expect(storeSource).toContain('supabase.rpc("publish_recovery_policy"');
    expect(storeSource).toContain("requested_mode: input.mode");
    expect(storeSource).toContain("requested_approved_test_recipient: approvedTestRecipient");
    expect(storeSource).toContain("requested_connection_id: connection.id");
    expect(storeSource).toContain("requested_user_id: userId");
    expect(storeSource).not.toContain('.from(RECOVERY_ACCOUNT_SETTINGS_TABLE)\n    .update(');
  });
});
