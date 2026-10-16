import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20261015000500_notification_quarantine_transition.sql"),
  "utf8",
);

describe("D4v notification quarantine transition", () => {
  it("requires an approved unexpired request and its independent reviewer", () => {
    expect(migration).toContain("request_row.status <> 'approved'");
    expect(migration).toContain("request_row.expires_at <= now_at");
    expect(migration).toContain("request_row.reviewer_id is distinct from requested_actor_id");
  });

  it("keeps delivery disabled and rejects provider evidence", () => {
    expect(migration).toContain("Notification delivery gates must remain disabled");
    expect(migration).toContain("Provider or delivery evidence prevents quarantine");
  });

  it("is single use, idempotent, and freezes delivery evidence", () => {
    expect(migration).toContain("recovery_notification_quarantines_request_unique");
    expect(migration).toContain("if request_row.status = 'quarantined'");
    expect(migration).toContain("A quarantined notification event is immutable");
    expect(migration).toContain("A quarantined notification event cannot record another delivery attempt");
  });

  it("does not expose the transition outside the service role", () => {
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
  });
});
