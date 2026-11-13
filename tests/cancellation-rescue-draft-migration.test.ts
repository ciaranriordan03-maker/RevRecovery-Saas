import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20261113000200_cancellation_rescue_draft_sequences.sql",
  ),
  "utf8",
).toLowerCase();
const cancellationStore = readFileSync(
  join(process.cwd(), "app/lib/server/cancellation-sequences.ts"),
  "utf8",
).toLowerCase();

describe("cancellation rescue draft sequence foundation", () => {
  it("creates isolated sequence and draft-message projections", () => {
    expect(migration).toContain("create table if not exists public.cancellation_sequences");
    expect(migration).toContain("create table if not exists public.cancellation_messages");
    expect(migration).toContain("unique (cancellation_case_id)");
    expect(migration).toContain("unique (sequence_id, message_key)");
    expect(migration).toContain("medium text not null default 'email_draft'");
  });

  it("enforces draft schedules before the subscription end", () => {
    expect(migration).toContain("message_schedule <= requested_projected_at");
    expect(migration).toContain("message_schedule >= scheduled_end");
    expect(migration).toContain("jsonb_array_length(requested_messages) > 3");
  });

  it("cancels pending drafts for reversed or terminated cases", () => {
    expect(migration).toContain("if target_case.status <> 'shadow'");
    expect(migration).toContain("sequence_status := 'canceled'");
    expect(migration).toContain("where sequence_id = target_sequence_id and status = 'draft'");
  });

  it("restricts Phase 2 projection to shadow and test modes", () => {
    expect(migration).toContain("not in ('shadow', 'test')");
    expect(migration).toContain("'mode_not_supported_phase_2'");
  });

  it("keeps writes service-only and tenant reads isolated", () => {
    expect(migration).toContain("security definer");
    expect(migration).toContain("using (auth.uid() = user_id)");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
  });

  it("has no external delivery, customer link, token, or Stripe mutation capability", () => {
    for (const forbidden of [
      "resend",
      "provider_message_id",
      "delivery_attempt",
      "recipient_email",
      "cancellation_rescue_tokens",
      "subscriptions.update",
      "stripe(",
    ]) {
      expect(migration).not.toContain(forbidden);
      expect(cancellationStore).not.toContain(forbidden);
    }
  });

  it("is additive and avoids destructive production operations", () => {
    expect(migration).not.toMatch(/\bdrop\s+table\b/);
    expect(migration).not.toMatch(/\btruncate\b/);
    expect(migration).not.toMatch(/\bdelete\s+from\b/);
  });
});
