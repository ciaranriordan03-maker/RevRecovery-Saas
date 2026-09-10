import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../supabase/migrations/20260910000100_phase3_recovery_segmentation.sql", import.meta.url), "utf8");
const manualSql = readFileSync(new URL("../supabase/sql/011_phase3_recovery_segmentation.sql", import.meta.url), "utf8");

describe("Phase 3 segmentation migration", () => {
  it("is additive, constrained, indexed, and backfills existing cases", () => {
    expect(migration).toContain("add column if not exists audience_segment");
    expect(migration).toContain("add column if not exists segment_snapshot");
    expect(migration).toContain("validate constraint failed_payments_audience_segment_check");
    expect(migration).toContain("failed_payments_user_segment_created_idx");
    expect(migration).toContain("when invoice_kind = 'subscription'");
    expect(migration).not.toMatch(/drop table|truncate /i);
  });

  it("provides standalone SQL that works in the hosted SQL editor", () => {
    expect(manualSql).toContain("alter table public.failed_payments");
    expect(manualSql).not.toContain("\\ir");
  });
});
