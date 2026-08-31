import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/20260831000600_phase0_recovery_schedules.sql",
  ),
  "utf8",
);

describe("Phase 0 recovery schedules migration", () => {
  it("backfills the exact legacy behavior without rewriting active cases", () => {
    expect(migration).toContain("where active_policy_version_id is null");
    expect(migration).toContain("'legacy_24_72'");
    expect(migration).toContain("(policy_id, 2, 1440, 'email')");
    expect(migration).toContain("(policy_id, 3, 4320, 'email')");
    expect(migration).not.toContain("update public.recovery_messages");
    expect(migration).not.toContain("update public.recovery_sequences");
  });

  it("publishes immutable versioned policies under a locked account row", () => {
    expect(migration).toContain("create or replace function public.publish_recovery_policy");
    expect(migration).toContain("for update;");
    expect(migration).toContain("coalesce(max(version), 0) + 1");
    expect(migration).toContain("set status = 'retired'");
    expect(migration).toContain("set active_policy_version_id = policy_id");
    expect(migration).toContain("recovery_mode = requested_mode");
    expect(migration).toContain("approved_test_recipient = nullif(trim(requested_approved_test_recipient), '')");
  });

  it("limits publication to the service role", () => {
    expect(migration).toContain("revoke all on function public.publish_recovery_policy");
    expect(migration).toContain("grant execute on function public.publish_recovery_policy");
    expect(migration).toContain("to service_role");
  });

  it("does not destructively remove production data", () => {
    expect(migration).not.toMatch(/\b(drop table|truncate|delete from)\b/i);
  });
});
