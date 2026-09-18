import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260911000100_phase4_retention_observation.sql",
  ),
  "utf8",
);

describe("Phase 4 retention observation migration", () => {
  it("creates durable cases and append-only lifecycle events", () => {
    expect(migration).toContain("create table if not exists public.retention_cases");
    expect(migration).toContain("create table if not exists public.retention_case_events");
    expect(migration).toContain("stripe_event_id text not null unique");
  });

  it("isolates merchants and Stripe environments", () => {
    expect(migration).toContain("user_id uuid not null references auth.users(id)");
    expect(migration).toContain("stripe_account_id text not null");
    expect(migration).toContain("livemode boolean not null");
    expect(migration).toContain("auth.uid() = user_id");
  });

  it("prevents duplicate open cases and stale state regression", () => {
    expect(migration).toContain("retention_cases_open_subscription_uidx");
    expect(migration).toContain("stale_event_ignored");
    expect(migration).toContain("requested_event_created_at < current_case.last_event_created_at");
  });

  it("keeps the mutation boundary service-role only", () => {
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
  });
});

