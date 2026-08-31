import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/20260831000700_phase0_environment_isolation.sql",
  ),
  "utf8",
);

describe("Phase 0 Stripe environment isolation migration", () => {
  it("backfills customer-state environment from its stored connection", () => {
    expect(migration).toContain("set livemode = connection.livemode");
    expect(migration).toContain(
      "connection.stripe_account_id = customer_state.stripe_account_id",
    );
    expect(migration).toContain("connection.user_id = customer_state.user_id");
  });

  it("makes customer state identity environment-specific", () => {
    expect(migration).toContain(
      "(stripe_account_id, livemode, stripe_customer_id)",
    );
    expect(migration).toContain("create unique index if not exists");
  });

  it("indexes failed-payment lookup with its environment", () => {
    expect(migration).toContain(
      "(stripe_account_id, livemode, stripe_invoice_id)",
    );
  });

  it("does not remove production records", () => {
    expect(migration).not.toMatch(/\b(drop table|truncate|delete from)\b/i);
  });
});
