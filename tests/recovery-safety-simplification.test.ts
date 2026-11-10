import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getRecoveryWorkspaceView } from "../app/lib/server/recovery-page-data";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const workspace = source("../app/components/dashboard/recovery-workspace.tsx");
const content = source("../app/components/dashboard/recovery-content.tsx");
const details = source(
  "../app/components/dashboard/recovery-workspace-details.tsx",
);
const settings = source(
  "../app/components/dashboard/recovery-settings-workspace.tsx",
);
const setupStatus = source(
  "../app/components/dashboard/recovery-setup-status.tsx",
);
const evidence = source(
  "../app/components/dashboard/essential-notification-preview.tsx",
);

describe("Recovery safety and audit simplification", () => {
  it("keeps only the two customer-facing Recovery views", () => {
    expect(workspace).toContain('label: "Overview"');
    expect(workspace).toContain('label: "Messages & timing"');
    expect(workspace).not.toContain("Safety & audit");
    expect(workspace).not.toContain("view=safety");
    expect(content).not.toContain("SafetyWorkspace");
    expect(details).not.toContain("SafetyWorkspace");
  });

  it("safely falls back from legacy and unknown views", () => {
    expect(getRecoveryWorkspaceView("overview")).toBe("overview");
    expect(getRecoveryWorkspaceView("flow")).toBe("flow");
    expect(getRecoveryWorkspaceView("safety")).toBe("overview");
    expect(getRecoveryWorkspaceView("anything-else")).toBe("overview");
    expect(getRecoveryWorkspaceView(undefined)).toBe("overview");
  });

  it("keeps healthy states quiet and moves incomplete setup into Settings", () => {
    expect(workspace).toContain("if (items.length === 0)");
    expect(workspace).toContain("return null");
    expect(workspace).not.toContain("No setup issues need attention");
    expect(settings).toContain('["#setup-status", "Setup status"]');
    expect(settings).toContain("RecoverySetupStatus");
    expect(setupStatus).toContain('check.status !== "complete"');
    expect(setupStatus).toContain("open={hasIssues}");
    expect(setupStatus).toContain("No action is required");
  });

  it("preserves deep operational evidence outside the primary workflow", () => {
    expect(evidence).toContain("Delivery reconciliation");
    expect(evidence).toContain("Quarantine health and evidence");
    expect(evidence).toContain("Checkpoint verified");
    expect(settings).toContain("Delivery safeguards");
  });
});
