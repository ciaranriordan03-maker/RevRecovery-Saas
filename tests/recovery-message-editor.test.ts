import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  getRecoveryMessageTemplateFieldErrors,
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
  it("reuses the existing settings APIs without changing delivery controls", () => {
    expect(editorSource).toContain('fetch("/api/settings"');
    expect(editorSource).toContain('fetch("/api/recovery/settings"');
    expect(editorSource).toContain('method: "PUT"');
    expect(editorSource).toContain("JSON.stringify({ settings: draftSettings })");
    expect(editorSource).toContain("mode: recoveryView.mode");
    expect(editorSource).toContain("timezone: recoveryView.timezone");
    expect(editorSource).toContain("scheduleId: selectedSchedule.id");
    expect(editorSource).toContain("It does not send an email or enable delivery");
  });

  it("offers editing, customer preview, cancellation and unsaved-change protection", () => {
    expect(editorSource).toContain("Save message");
    expect(editorSource).toContain("Cancel");
    expect(editorSource).toContain("Customer preview");
    expect(editorSource).toContain("Three-message sequence");
    expect(editorSource).toContain('MobileWorkspaceView = "edit" | "preview"');
    expect(editorSource).toContain("beforeunload");
    expect(editorSource).toContain("unsaved message or timing changes");
    expect(editorSource).toContain("Advanced message settings");
  });

  it("shows compact timing controls and a live customer preview", () => {
    expect(editorSource).toContain("Copy only");
    expect(editorSource).toContain("selectedTiming");
    expect(editorSource).toContain("CustomerEmailPreview");
    expect(editorSource).toContain("Edit timing");
    expect(editorSource).toContain("Choose message timing");
    expect(editorSource).toContain("RECOVERY_SCHEDULES.map");
    expect(editorSource).toContain("Messages always stay in order");
    expect(editorSource).toContain("active sequences keep their original");
    expect(editorSource).not.toContain("defaultEmailTone");
  });

  it("removes the oversized summary and renders the editor directly", () => {
    expect(workspaceSource).toContain("<RecoveryMessageEditor");
    expect(workspaceSource).toContain("initialSettings={userSettings}");
    expect(workspaceSource).not.toContain("Delivery mode");
    expect(workspaceSource).not.toContain("Saved messages");
    expect(workspaceSource).not.toContain("summaryItems");
  });

  it("keeps timezone and schedule snapshots secondary and explicit", () => {
    expect(editorSource).toContain("Times use {recoveryView.timezone}");
    expect(editorSource).toContain("Future cases use the new timing");
    expect(editorSource).toContain("active sequences keep their original");
    expect(editorSource).toContain("recoveryView.editable");
    expect(editorSource).toContain('href="/dashboard/recovery?step=customize#recovery-delivery"');
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

  it("returns field-specific errors for accessible inline feedback", () => {
    expect(
      getRecoveryMessageTemplateFieldErrors(
        { ...template, subject: "https://example.com" },
        1,
      ),
    ).toEqual({
      subject:
        "Recovery email 1 subject cannot include a URL. RevRecovery adds the secure payment link automatically.",
    });

    expect(
      getRecoveryMessageTemplateFieldErrors(
        { ...template, bodyPreview: "" },
        1,
      ),
    ).toEqual({
      bodyPreview: "Recovery email 1 message is required.",
    });
  });
});
