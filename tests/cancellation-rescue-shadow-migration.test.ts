import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20261113000100_cancellation_rescue_shadow_foundation.sql",
  ),
  "utf8",
).toLowerCase();
const webhookRoute = readFileSync(
  join(process.cwd(), "app/api/stripe/webhooks/connect/route.ts"),
  "utf8",
);
const cancellationStore = readFileSync(
  join(process.cwd(), "app/lib/server/cancellation-cases.ts"),
  "utf8",
);

describe("cancellation rescue shadow foundation", () => {
  it("creates isolated account, state, case, and append-only evidence tables", () => {
    for (const table of [
      "cancellation_rescue_settings",
      "cancellation_subscription_states",
      "cancellation_cases",
      "cancellation_case_events",
    ]) {
      expect(migration).toContain(`create table if not exists public.${table}`);
    }
    expect(migration).toContain("unique (user_id, stripe_account_id, livemode, stripe_subscription_id, episode_number)");
    expect(migration).toContain("unique (user_id, stripe_account_id, livemode, source, source_event_id)");
  });

  it("defaults every account and environment to shadow", () => {
    expect(migration).toContain("mode text not null default 'shadow'");
    expect(migration).toContain("requested_user_id, requested_stripe_account_id, requested_livemode, 'shadow'");
  });

  it("serializes episode transitions and rejects stale events", () => {
    expect(migration).toContain("for update");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("hashtextextended");
    expect(migration).toContain("requested_event_created_at < current_state.latest_event_created_at");
    expect(migration).toContain("'ignored_stale'::text");
    expect(migration).toContain("next_episode := next_episode + 1");
    expect(migration).toContain("or current_case.id is null");
    expect(migration).toContain("'cancellation_reversed'");
    expect(migration).toContain("'subscription_terminated'");
  });

  it("keeps writes service-only and tenant reads isolated", () => {
    expect(migration).toContain("security definer");
    expect(migration).toContain("using (auth.uid() = user_id)");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
    expect(migration).toContain("revoke insert, update, delete on table public.cancellation_case_events");
  });

  it("contains no delivery, token, UI, or Stripe mutation capability", () => {
    expect(migration).not.toContain("cancellation_messages");
    expect(migration).not.toContain("cancellation_rescue_tokens");
    expect(cancellationStore).not.toContain("recovery-delivery");
    expect(cancellationStore).not.toContain("resend");
    expect(cancellationStore).not.toContain("subscriptions.update");
    expect(cancellationStore).not.toContain("recovery_messages");
  });

  it("connects only the existing server-side Stripe subscription boundary", () => {
    expect(webhookRoute).toContain("recordCancellationSubscriptionEvent");
    expect(webhookRoute).toContain('source: "stripe_webhook"');
    expect(webhookRoute).not.toContain("cancellation-rescue/page");
  });

  it("is additive and avoids destructive production operations", () => {
    expect(migration).not.toMatch(/\bdrop\s+table\b/);
    expect(migration).not.toMatch(/\btruncate\b/);
    expect(migration).not.toMatch(/\bdelete\s+from\b/);
  });
});
