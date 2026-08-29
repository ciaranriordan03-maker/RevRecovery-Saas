import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260829000100_phase0_database_foundation.sql",
  ),
  "utf8",
).toLowerCase();

describe("Phase 0 database foundation migration", () => {
  it("is additive and avoids destructive production-data operations", () => {
    expect(migration).toContain("add column if not exists");
    expect(migration).not.toMatch(/\bdrop\s+table\b/);
    expect(migration).not.toMatch(/\btruncate\b/);
    expect(migration).not.toMatch(/\bdelete\s+from\b/);
  });

  it("adds durable webhook and delivery attempt history", () => {
    expect(migration).toContain("create table if not exists public.stripe_webhook_attempts");
    expect(migration).toContain("create table if not exists public.recovery_message_attempts");
    expect(migration).toContain("processing_attempt_count");
    expect(migration).toContain("send_attempt_count");
  });

  it("adds recovery modes, versioned policies, and explicit case states", () => {
    expect(migration).toContain("create table if not exists public.recovery_account_settings");
    expect(migration).toContain("create table if not exists public.recovery_policy_versions");
    expect(migration).toContain("create table if not exists public.recovery_policy_steps");
    for (const value of [
      "'off'",
      "'test'",
      "'live'",
      "'paused'",
      "'awaiting_retry'",
      "'payment_method_updated'",
      "'no_longer_applicable'",
      "'failed_operationally'",
    ]) {
      expect(migration).toContain(value);
    }
  });

  it("retains recurring-subscription and failure context", () => {
    for (const column of [
      "stripe_subscription_id",
      "stripe_payment_intent_id",
      "stripe_charge_id",
      "billing_reason",
      "invoice_kind",
      "decline_code",
      "failure_category",
    ]) {
      expect(migration).toContain(column);
    }
  });

  it("provides service-only atomic claim helpers", () => {
    expect(migration).toContain("function public.claim_stripe_webhook_event");
    expect(migration).toContain("function public.claim_due_recovery_messages");
    expect(migration).toContain("for update skip locked");
    expect(migration).toContain("'failed_retryable', 'claimed'");
    expect(migration).toContain("security definer");
    expect(migration).toContain("revoke all on function");
    expect(migration).toContain("to service_role");
  });
});
