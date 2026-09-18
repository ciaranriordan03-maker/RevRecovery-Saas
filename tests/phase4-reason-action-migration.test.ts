import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260911000200_phase4_reason_and_action_foundation.sql",
  ),
  "utf8",
);

describe("Phase 4 reason and action foundation migration", () => {
  it("stores merchant-scoped retention configuration safely", () => {
    expect(migration).toContain(
      "create table if not exists public.retention_account_settings",
    );
    expect(migration).toContain("eligible_downgrade_price_ids text[]");
    expect(migration).toContain("auth.uid() = user_id");
  });

  it("stores one validated structured reason response per case", () => {
    expect(migration).toContain(
      "create table if not exists public.retention_reason_responses",
    );
    expect(migration).toContain(
      "constraint retention_reason_responses_case_unique unique (case_id)",
    );
    expect(migration).toContain("reason_code <> 'other'");
    expect(migration).toContain("length(comment) <= 1000");
  });

  it("separates presented, accepted, and verified action outcomes", () => {
    expect(migration).toContain(
      "create table if not exists public.retention_action_events",
    );
    expect(migration).toContain("'presented', 'accepted', 'rejected', 'abandoned'");
    expect(migration).toContain(
      "'execution_requested', 'execution_failed', 'verified'",
    );
    expect(migration).toContain("idempotency_key text not null unique");
  });

  it("does not expose customer-write policies before a signed flow exists", () => {
    expect(migration).not.toContain("for insert to anon");
    expect(migration).not.toContain("for update to anon");
  });
});
