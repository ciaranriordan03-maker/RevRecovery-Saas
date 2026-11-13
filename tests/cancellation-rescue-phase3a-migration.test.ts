import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20261113000300_cancellation_rescue_phase3a_ingestion.sql"),
  "utf8",
).toLowerCase();
const reconciliation = readFileSync(
  join(process.cwd(), "app/lib/server/cancellation-reconciliation.ts"),
  "utf8",
);
const sync = readFileSync(join(process.cwd(), "app/lib/server/stripe-sync.ts"), "utf8");

describe("cancellation rescue phase 3A", () => {
  it("adds resumable runs, deterministic ordering, and a transactional outbox", () => {
    expect(migration).toContain("cancellation_reconciliation_runs");
    expect(migration).toContain("cancellation_event_order");
    expect(migration).toContain("claim_cancellation_event_order");
    expect(migration).toContain("cancellation_projection_outbox");
    expect(migration).toContain("after insert on public.cancellation_case_events");
    expect(migration).toContain("for update of job skip locked");
  });

  it("has platform and account shadow kill switches", () => {
    expect(migration).toContain("cancellation_platform_controls");
    expect(migration).toContain("shadow_processing_enabled");
    expect(migration).toContain("controls.enabled");
  });

  it("bounds retries and dead-letters exhausted work", () => {
    expect(migration).toContain("dead_letter");
    expect(migration).toContain("processing_attempt_count < requested_max_attempts");
    expect(migration).toContain("dead_letter_exhausted_stripe_webhooks");
  });

  it("uses page cursors and observes all subscription states", () => {
    expect(sync).toContain("collectStripePages");
    expect(reconciliation).toContain("starting_after: cursor");
    expect(reconciliation).toContain('source: "reconciliation"');
    expect(reconciliation).not.toContain("cancel_at_period_end === true");
  });

  it("does not add delivery, action tokens, or Stripe mutation", () => {
    expect(migration).not.toContain("rescue_token");
    expect(reconciliation).not.toContain("subscriptions.update");
    expect(reconciliation).not.toContain("resend");
  });

  it("is additive", () => {
    expect(migration).not.toMatch(/\bdrop\s+table\b/);
    expect(migration).not.toMatch(/\btruncate\b/);
    expect(migration).not.toMatch(/\bdelete\s+from\b/);
  });
});
