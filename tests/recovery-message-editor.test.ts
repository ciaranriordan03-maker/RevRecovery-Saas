import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  getRecoveryMessageTemplateValidationError,
  RECOVERY_MESSAGE_TEMPLATES,
} from "../app/lib/recovery/message-templates";

const editorSource = readFileSync(
  new URL(
    "../app/components/dashboard/recovery-message-editor.tsx",
    import.meta.url,
  ),
  "utf8",
);
const workspaceSource = readFileSync(
  new URL(
    "../app/components/dashboard/recovery-workspace-details.tsx",
    import.meta.url,
  ),
  "utf8",
);

describe("inline recovery message editor", () => {
  it("reuses the existing settings API without changing delivery settings", () => {
    expect(editorSource).toContain('fetch("/api/settings"');
    expect(editorSource).toContain('method: "PUT"');
    expect(editorSource).toContain("JSON.stringify({ settings: draftSettings })");
    expect(editorSource).not.toContain("/api/recovery/settings");
    expect(editorSource).toContain("It does not send an email or enable delivery");
  });

  it("offers editing, customer preview, cancellation and unsaved-change protection", () => {
    expect(editorSource).toContain("Save message");
    expect(editorSource).toContain("Cancel");
    expect(editorSource).toContain("Example customer email");
    expect(editorSource).toContain("beforeunload");
    expect(editorSource).toContain("discard your unsaved message changes");
    expect(editorSource).toContain("Advanced message settings");
  });

  it("is rendered directly in the Messages and timing workspace", () => {
    expect(workspaceSource).toContain("<RecoveryMessageEditor");
    expect(workspaceSource).toContain("initialSettings={userSettings}");
  });
});

describe("recovery message draft validation", () => {
  const template = RECOVERY_MESSAGE_TEMPLATES[0];

  it("requires customer-facing copy", () => {
    expect(
      getRecoveryMessageTemplateValidationError(
        { ...template, subject: "" },
        1,
      ),
    ).toBe("Recovery email 1 subject is required.");
    expect(
      getRecoveryMessageTemplateValidationError(
        { ...template, bodyPreview: "" },
        1,
      ),
    ).toBe("Recovery email 1 message is required.");
  });

  it("keeps secure payment links system-controlled", () => {
    expect(
      getRecoveryMessageTemplateValidationError(
        { ...template, bodyPreview: "Pay at https://example.com" },
        1,
      ),
    ).toContain("cannot include a URL");
  });
});
