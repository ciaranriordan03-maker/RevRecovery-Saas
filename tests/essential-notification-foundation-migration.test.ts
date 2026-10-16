import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20261012000100_essential_notification_foundation.sql"),
  "utf8",
).toLowerCase();

describe("essential notification foundation migration", () => {
  it("is additive and leaves delivery disabled by default", () => {
    expect(migration).toContain("add column if not exists essential_notifications_enabled boolean not null default false");
    expect(migration).toContain("create table if not exists public.recovery_notification_events");
    expect(migration).toContain("delivery_enabled_snapshot boolean not null default false");
    expect(migration).not.toMatch(/\b(drop table|truncate|delete from)\b/);
  });

  it("constrains rules, states, cooldowns, and sent-event safety", () => {
    expect(migration).toContain("'webhook_failure', 'sending_domain_failure', 'attention_digest'");
    expect(migration).toContain("unique (deduplication_key)");
    expect(migration).toContain("check (cooldown_until > occurred_at)");
    expect(migration).toContain("delivery_enabled_snapshot = true and sent_at is not null");
  });

  it("allows tenant reads without allowing authenticated writes", () => {
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("for select to authenticated");
    expect(migration).toContain("auth.uid() = user_id");
    expect(migration).not.toContain("for insert to authenticated");
    expect(migration).not.toContain("for update to authenticated");
  });
});
