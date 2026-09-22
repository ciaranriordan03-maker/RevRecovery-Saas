import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260922000200_manual_case_pause.sql"),
  "utf8",
).toLowerCase();

describe("manual recovery case pause", () => {
  it("uses additive state that distinguishes manual and automatic pauses", () => {
    expect(migration).toContain("add column if not exists manual_outreach_paused_at");
    expect(migration).toContain("add column if not exists manual_pause_previous_status");
    expect(migration).not.toMatch(/\bdrop\s+table\b/);
    expect(migration).not.toMatch(/\btruncate\b/);
    expect(migration).not.toMatch(/\bdelete\s+from\b/);
  });

  it("locks and scopes every action to the authenticated tenant", () => {
    expect(migration).toContain("and user_id = requested_user_id");
    expect(migration).toContain("for update");
    expect(migration).toContain("requested_failed_payment_id uuid");
  });

  it("only resumes messages that were paused by this control", () => {
    expect(migration).toContain("manual_pause_previous_status = status");
    expect(migration).toContain("status = manual_pause_previous_status");
    expect(migration).toContain("and manual_pause_previous_status in");
  });

  it("keeps the function server-only and records auditable transitions", () => {
    expect(migration).toContain("insert into public.recovery_case_transitions");
    expect(migration).toContain("'manual_outreach_paused'");
    expect(migration).toContain("'manual_outreach_resumed'");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
  });

  it("authenticates and validates the case action route", () => {
    const route = readFileSync(
      new URL("../app/api/recovery/cases/[id]/pause/route.ts", import.meta.url),
      "utf8",
    );
    expect(route).toContain("supabase.auth.getClaims()");
    expect(route).toContain("UUID_PATTERN.test(id)");
    expect(route).toContain('typeof body.paused !== "boolean"');
    expect(route).toContain("setRecoveryCaseManualPause");
  });
});
