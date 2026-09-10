import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../app/components/dashboard/recovery-settings-form.tsx", import.meta.url),
  "utf8",
);

describe("recovery settings form", () => {
  it("saves delivery settings through the dedicated recovery API", () => {
    expect(source).toContain('fetch("/api/recovery/settings"');
    expect(source).toContain('method: "PUT"');
    expect(source).toContain("Save delivery settings");
    expect(source).toContain('recovery.mode === "test"');
    expect(source).toContain("Approved test recipient");
  });

  it("preserves the full user settings object when saving email identity", () => {
    expect(source).toContain('fetch("/api/settings"');
    expect(source).toContain("JSON.stringify({ settings })");
    expect(source).toContain("Save recovery content");
    expect(source).toContain("router.refresh()");
  });

  it("configures deterministic invoice audiences", () => {
    expect(source).toContain("Audience segmentation");
    expect(source).toContain("Recurring subscriptions");
    expect(source).toContain("Standalone invoices");
    expect(source).toContain("Unknown invoice type");
  });
});
