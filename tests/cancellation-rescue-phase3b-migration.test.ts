import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20261124000100_cancellation_rescue_phase3b_test_actions.sql",
  ),
  "utf8",
).toLowerCase();

describe("cancellation rescue phase 3B migration", () => {
  it("defaults both action controls off and excludes live-mode records", () => {
    expect(migration).toContain("test_rescue_actions_enabled boolean not null default false");
    expect(migration).toContain("values ('test_rescue_actions', false)");
    expect(migration).toContain("livemode boolean not null check (livemode = false)");
    expect(migration).toContain("settings.mode = 'test'");
    expect(migration).toContain("connections.livemode = false");
  });

  it("stores only hashes and makes reservation and use atomic", () => {
    expect(migration).toContain("token_hash text not null unique");
    expect(migration).not.toContain("raw_token");
    expect(migration).toContain("for update");
    expect(migration).toContain("reserve_cancellation_test_rescue_token");
    expect(migration).toContain("complete_cancellation_test_rescue_attempt");
    expect(migration).toContain("idempotency_key text not null unique");
  });

  it("fails closed after an ambiguous reserved outcome and reconciles confirmation", () => {
    expect(migration).toContain("reconcile_stale_cancellation_test_rescue_reservations");
    expect(migration).toContain("reservation_outcome_unknown");
    expect(migration).toContain("finalize_confirmed_cancellation_test_rescues");
    expect(migration).toContain("cases.status = 'reversed'");
  });

  it("keeps action and audit storage service-only", () => {
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).not.toMatch(/grant .* to authenticated/);
    expect(migration).toContain("to service_role");
  });

  it("is additive", () => {
    expect(migration).not.toMatch(/\bdrop\s+table\b/);
    expect(migration).not.toMatch(/\btruncate\b/);
    expect(migration).not.toMatch(/\bdelete\s+from\b/);
  });
});
