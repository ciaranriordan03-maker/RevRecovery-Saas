import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260903000300_phase2_sending_domain_foundation.sql",
  ),
  "utf8",
).toLowerCase();

describe("Phase 2 sending-domain foundation migration", () => {
  it("is additive and does not change existing delivery configuration", () => {
    expect(migration).toContain(
      "create table if not exists public.recovery_sending_domains",
    );
    expect(migration).not.toMatch(/alter\s+table\s+public\.recovery_messages/);
    expect(migration).not.toMatch(/update\s+public\./);
    expect(migration).not.toMatch(/\bdelete\s+from\b/);
    expect(migration).not.toMatch(/\bdrop\s+table\b/);
  });

  it("keeps one normalized sending domain per merchant", () => {
    expect(migration).toContain("unique (user_id)");
    expect(migration).toContain("unique (domain)");
    expect(migration).toContain("domain = lower(btrim(domain))");
  });

  it("stores provider verification state without storing provider credentials", () => {
    expect(migration).toContain("provider_domain_id text");
    expect(migration).toContain("dns_records jsonb");
    expect(migration).toContain(
      "status in ('pending', 'verified', 'failed', 'disabled')",
    );
    expect(migration).not.toMatch(/api_key|secret_key|access_token/);
  });

  it("allows users to read only their own domain while writes remain server-side", () => {
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("using (auth.uid() = user_id)");
    expect(migration).toContain("revoke insert, update, delete");
    expect(migration).toContain(
      "grant select, insert, update, delete on table public.recovery_sending_domains to service_role",
    );
  });
});
