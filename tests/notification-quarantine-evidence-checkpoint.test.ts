import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20261015000600_notification_quarantine_evidence_checkpoint.sql"),
  "utf8",
);

describe("D4z notification quarantine evidence checkpoint", () => {
  it("creates one versioned SHA-256 checkpoint per final quarantine", () => {
    expect(migration).toContain("notification-quarantine-checkpoint-v1");
    expect(migration).toContain("evidence_fingerprint ~ '^[0-9a-f]{64}$'");
    expect(migration).toContain("recovery_notification_quarantine_checkpoints_quarantine_unique");
    expect(migration).toContain("extensions.digest");
  });

  it("binds the quarantine, review, and ordered audit ledger into the fingerprint", () => {
    expect(migration).toContain("quarantine.resolution_request_id::text");
    expect(migration).toContain("request.requester_id::text");
    expect(migration).toContain("order by audit.created_at, audit.id");
    expect(migration).toContain("audit.evidence_summary");
  });

  it("requires independent review and exactly one lifecycle audit entry", () => {
    expect(migration).toContain("request_row.requester_id = request_row.reviewer_id");
    expect(migration).toContain("requested_count <> 1 or approved_count <> 1 or quarantined_count <> 1");
    expect(migration).toContain("deferrable initially deferred");
  });

  it("backfills existing quarantines and makes checkpoints immutable", () => {
    expect(migration).toContain("from public.recovery_notification_quarantines quarantine");
    expect(migration).toContain("Notification quarantine evidence checkpoints are immutable");
    expect(migration).toContain("before update or delete");
  });

  it("exposes no mutation path to application users", () => {
    expect(migration).toContain("revoke insert, update, delete");
    expect(migration).toContain("grant select on table public.recovery_notification_quarantine_checkpoints to authenticated");
    expect(migration).toContain("to service_role");
  });
});
