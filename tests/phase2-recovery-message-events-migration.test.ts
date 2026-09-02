import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260902000100_phase2_recovery_message_events.sql",
  ),
  "utf8",
).toLowerCase();

describe("Phase 2 recovery message event foundation migration", () => {
  it("is additive and avoids destructive production-data operations", () => {
    expect(migration).toContain("create table if not exists public.recovery_message_events");
    expect(migration).not.toMatch(/\bdrop\s+table\b/);
    expect(migration).not.toMatch(/\btruncate\b/);
    expect(migration).not.toMatch(/\bdelete\s+from\b/);
  });

  it("deduplicates provider deliveries and retains event ordering facts", () => {
    expect(migration).toContain("unique (provider, provider_event_id)");
    expect(migration).toContain("provider_message_id text not null");
    expect(migration).toContain("occurred_at timestamptz not null");
    expect(migration).toContain("received_at timestamptz not null");
  });

  it("links events to recovery messages without deleting immutable history", () => {
    expect(migration).toContain(
      "recovery_message_id uuid references public.recovery_messages(id) on delete set null",
    );
    expect(migration).toContain("user_id uuid references auth.users(id) on delete set null");
  });

  it("permits only server-side writes while users can read their own events", () => {
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("using (auth.uid() = user_id)");
    expect(migration).toContain("revoke insert, update, delete");
    expect(migration).toContain("grant select, insert on table public.recovery_message_events to service_role");
  });
});
