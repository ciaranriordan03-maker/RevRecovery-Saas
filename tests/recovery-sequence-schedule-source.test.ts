import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../app/lib/server/recovery-sequences.ts", import.meta.url),
  "utf8",
);

describe("recovery sequence schedule source", () => {
  it("schedules messages from the persisted snapshot", () => {
    expect(source).toContain("accountSettings.schedule");
    expect(source).toContain("configuration_snapshot");
    expect(source).toContain("policy_version_id");
    expect(source).toContain("scheduleFromOffset");
    expect(source).not.toContain("function addHours");
  });

  it("does not rewrite an existing sequence snapshot", () => {
    expect(source).toContain("existingSequence");
    expect(source).toContain("if (!sequence)");
    expect(source).not.toContain('.from(RECOVERY_SEQUENCES_TABLE)\n      .upsert(');
  });

  it("handles concurrent sequence and message creation idempotently", () => {
    expect(source).toContain('sequenceError.code !== "23505"');
    expect(source).toContain("concurrentSequence");
    expect(source).toContain("ignoreDuplicates: true");
    expect(source).toContain('onConflict: "sequence_id,message_key"');
  });
});
