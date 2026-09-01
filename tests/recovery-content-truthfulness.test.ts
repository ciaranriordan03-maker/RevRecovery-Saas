import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../app/components/dashboard/recovery-content.tsx", import.meta.url),
  "utf8",
);

describe("recovery content truthfulness", () => {
  it("describes message editing and active-sequence snapshots accurately", () => {
    expect(source).toContain("Message copy can be edited here");
    expect(source).toContain("audience segmentation is not available yet");
    expect(source).toContain("Saved message preview");
    expect(source).toContain("currently saved for new recovery cases");
    expect(source).toContain(
      "Existing active sequences keep the configuration snapshot they started with",
    );
    expect(source).not.toContain(
      "individual message editing are not available yet",
    );
    expect(source).not.toContain(
      "Template editing is planned for a later phase",
    );
  });
});
