import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260922000100_recovery_case_event_ledger.sql",
  ),
  "utf8",
).toLowerCase();

describe("recovery case event ledger migration", () => {
  it("is additive and does not delete or rewrite authoritative recovery data", () => {
    expect(migration).toContain(
      "create table if not exists public.recovery_case_events",
    );
    expect(migration).not.toMatch(/\bdrop\s+table\b/);
    expect(migration).not.toMatch(/\btruncate\b/);
    expect(migration).not.toMatch(/\bdelete\s+from\b/);
    expect(migration).not.toContain("update public.failed_payments");
    expect(migration).not.toContain("update public.recovery_messages");
  });

  it("keeps tenant, Stripe environment, source, and ordering facts", () => {
    expect(migration).toContain("user_id uuid not null");
    expect(migration).toContain("stripe_account_id text not null");
    expect(migration).toContain("livemode boolean");
    expect(migration).not.toContain("coalesce(payment.livemode, false)");
    expect(migration).not.toContain("coalesce(new.livemode, false)");
    expect(migration).toContain("source_event_id text not null");
    expect(migration).toContain("occurred_at timestamptz not null");
    expect(migration).toContain("recorded_at timestamptz not null");
    expect(migration).toContain("unique (source, source_event_id)");
  });

  it("captures Stripe, state, message, and provider facts through observers", () => {
    expect(migration).toContain("capture_failed_payment_stripe_event");
    expect(migration).toContain("capture_recovery_case_transition_event");
    expect(migration).toContain("capture_recovery_message_timeline_event");
    expect(migration).toContain("capture_provider_message_timeline_event");
    expect(migration).toContain("after insert or update of latest_stripe_event_id");
    expect(migration).toContain("after insert on public.recovery_message_events");
  });

  it("allows tenant reads but keeps ledger writes server-side and append-only", () => {
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("using (auth.uid() = user_id)");
    expect(migration).toContain("revoke insert, update, delete");
    expect(migration).toContain(
      "grant select, insert on table public.recovery_case_events to service_role",
    );
    expect(migration).not.toContain(
      "grant select, insert, update on table public.recovery_case_events",
    );
  });

  it("backfills only facts that already exist and remains idempotent", () => {
    expect(migration).toContain("from public.failed_payments as payment");
    expect(migration).toContain("from public.recovery_case_transitions as transition");
    expect(migration).toContain("from public.recovery_messages as message");
    expect(migration).toContain("from public.recovery_message_events as event");
    expect(migration.match(/on conflict \(source, source_event_id\) do nothing/g)?.length)
      .toBeGreaterThanOrEqual(9);
  });
});
