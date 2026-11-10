import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = [
  "../app/components/dashboard/recovery-content.tsx",
  "../app/components/dashboard/recovery-settings-workspace.tsx",
]
  .map((path) => readFileSync(new URL(path, import.meta.url), "utf8"))
  .join("\n");

describe("recovery content truthfulness", () => {
  it("describes message editing and active-sequence snapshots accurately", () => {
    expect(source).toContain("Message copy and timing now have their own focused workspace");
    expect(source).toContain("Edit messages & timing");
    expect(source).toContain("Delivery and sender details");
    expect(source).not.toContain("Saved message preview");
    expect(source).not.toContain("Recovery message templates");
    expect(source).not.toContain(
      "individual message editing are not available yet",
    );
    expect(source).not.toContain(
      "Template editing is planned for a later phase",
    );
  });
});
