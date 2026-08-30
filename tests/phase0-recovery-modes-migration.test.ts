import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260830000500_phase0_recovery_modes_and_lifecycle.sql",
);
const migration = fs.readFileSync(migrationPath, "utf8");

describe("Phase 0 recovery modes and lifecycle migration", () => {
  it("backfills existing connections without disabling current outreach", () => {
    expect(migration).toContain("insert into public.recovery_account_settings");
    expect(migration).toContain("'live'");
    expect(migration).toContain("on conflict (stripe_connection_id) do nothing");
  });

  it("claims messages only for active sequences in test or live mode", () => {
    expect(migration).toContain("join public.recovery_account_settings as settings");
    expect(migration).toContain("sequence.status = 'active'");
    expect(migration).toContain("settings.recovery_mode in ('test', 'live')");
    expect(migration).toContain("for update of message skip locked");
  });

  it("marks a case exhausted after its final message is sent", () => {
    expect(migration).toContain("unfinished_message.status in (");
    expect(migration).toContain("select max(candidate.step_number)");
    expect(migration).toContain("status = 'exhausted'");
    expect(migration).toContain("terminal_reason = 'final_message_sent'");
    expect(migration).toContain("'exhausted', 'final_message_sent'");
  });

  it("marks terminal delivery failures operational and permits replay", () => {
    expect(migration).toContain("status = 'failed_operationally'");
    expect(migration).toContain("and status = 'failed_terminal'");
    expect(migration).toContain("delivery_generation = delivery_generation + 1");
    expect(migration).toContain("and case_status = 'failed_operationally'");
  });

  it("does not destructively remove production data", () => {
    expect(migration).not.toMatch(/\b(drop table|truncate|delete from)\b/i);
  });
});
