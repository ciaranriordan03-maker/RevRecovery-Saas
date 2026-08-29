import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260829000200_phase0_webhook_processing.sql",
  ),
  "utf8",
).toLowerCase();

describe("Phase 0 webhook processing migration", () => {
  it("records each successful claim atomically", () => {
    expect(migration).toContain("insert into public.stripe_webhook_attempts");
    expect(migration).toContain("'processing'");
    expect(migration).toContain("processing_attempt_count");
  });

  it("requires the active claim token to complete an event", () => {
    expect(migration).toContain("event.claim_token = requested_claim_token");
    expect(migration).toContain("event.status = 'processing'");
    expect(migration).toContain("function public.complete_stripe_webhook_event");
  });

  it("provides service-role-only replay for failed events", () => {
    expect(migration).toContain("function public.request_stripe_webhook_replay");
    expect(migration).toContain("event.status = 'failed'");
    expect(migration).toContain("to service_role");
    expect(migration).toContain("from public, anon, authenticated");
  });

  it("contains no destructive production-data operation", () => {
    expect(migration).not.toMatch(/\bdrop\s+table\b/);
    expect(migration).not.toMatch(/\btruncate\b/);
    expect(migration).not.toMatch(/\bdelete\s+from\b/);
  });
});
