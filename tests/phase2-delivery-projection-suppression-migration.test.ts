import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260902000200_phase2_delivery_projection_and_suppression.sql",
  ),
  "utf8",
).toLowerCase();

describe("Phase 2 delivery projection and recipient suppression migration", () => {
  it("keeps provider delivery state separate from send-worker and payment state", () => {
    expect(migration).toContain("provider_delivery_status text");
    expect(migration).toContain("provider_delivery_occurred_at timestamptz");
    expect(migration).not.toMatch(/update\s+public\.failed_payments/);
    expect(migration).not.toMatch(/update\s+public\.recovery_sequences/);
  });

  it("records and projects provider events atomically and idempotently", () => {
    expect(migration).toContain("function public.record_recovery_message_event");
    expect(migration).toContain("for update");
    expect(migration).toContain("on conflict (provider, provider_event_id) do nothing");
    expect(migration).toContain("provider_delivery_status = requested_event_type");
    expect(migration).toContain("requested_rank > current_rank");
  });

  it("scopes suppressions to one merchant account and normalized recipient", () => {
    expect(migration).toContain("create table if not exists public.recovery_recipient_suppressions");
    expect(migration).toContain("unique (user_id, normalized_recipient_email)");
    expect(migration).toContain("using (auth.uid() = user_id)");
    expect(migration).toContain("auth.uid() = user_id");
  });

  it("suppresses only hard-bounce, complaint, or provider-suppressed recipients", () => {
    expect(migration).toContain(
      "requested_event_type in ('bounced', 'complained', 'suppressed')",
    );
    expect(migration).toContain("status in ('pending', 'scheduled', 'failed_retryable', 'paused')");
  });

  it("keeps the mutation RPC server-only", () => {
    expect(migration).toContain("security definer");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
  });
});
