import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260829000300_phase0_recovery_state.sql",
  ),
  "utf8",
).toLowerCase();

describe("Phase 0 recovery state migration", () => {
  it("allows only payment failures to create a recovery case", () => {
    expect(migration).toContain(
      "if requested_event_type <> 'invoice.payment_failed' then",
    );
    expect(migration).toContain("insert into public.failed_payments");
  });

  it("prevents a delayed failure from reopening a newer successful invoice", () => {
    expect(migration).toContain(
      "later_event.event_type in ('invoice.paid', 'invoice.payment_succeeded')",
    );
    expect(migration).toContain("in ('paid', 'void', 'uncollectible')");
    expect(migration).toContain(
      "later_event.event_created_at >= requested_event_created_at",
    );
  });

  it("validates the connected account environment before mutating cases", () => {
    expect(migration).toContain("from public.stripe_connections as connection");
    expect(migration).toContain("stripe connection or environment mismatch");
  });

  it("uses explicit, audited recovery-case transitions", () => {
    expect(migration).toContain("function public.is_recovery_case_transition_allowed");
    expect(migration).toContain("insert into public.recovery_case_transitions");
    expect(migration).toContain("terminal cases cannot be reopened");
  });

  it("pauses outreach after a payment method update", () => {
    expect(migration).toContain("function public.pause_recovery_cases_for_payment_method");
    expect(migration).toContain("set status = 'paused'");
    expect(migration).toContain("'awaiting_payment_retry_result'");
  });

  it("keeps mutation functions restricted to the service role", () => {
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
  });

  it("contains no destructive production-data operation", () => {
    expect(migration).not.toMatch(/\bdrop\s+table\b/);
    expect(migration).not.toMatch(/\btruncate\b/);
    expect(migration).not.toMatch(/\bdelete\s+from\b/);
  });
});
