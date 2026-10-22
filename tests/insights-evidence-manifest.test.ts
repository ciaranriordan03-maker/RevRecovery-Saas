import { describe, expect, it } from "vitest";
import {
  verifyMeasurementEvidenceManifest,
  verifyMeasurementEvidenceManifestJson,
  type MeasurementEvidenceExportManifest,
} from "../app/lib/insights-evidence-manifest";

const manifest = (
  overrides: Partial<MeasurementEvidenceExportManifest> = {},
): MeasurementEvidenceExportManifest => ({
  boundaries: {
    current: "2026-09-17T12:00:00.000Z ≤ created_at ≤ 2026-10-17T12:00:00.000Z",
    previous: "2026-08-18T12:00:00.000Z ≤ created_at < 2026-09-17T12:00:00.000Z",
  },
  contractVersion: "revrecovery-insights-v1",
  definitions: [{ label: "Cohort inclusion", value: "Cases inside the selected boundary and scope." }],
  evaluatedAt: "2026-10-17T12:00:00.000Z",
  fingerprint: {
    algorithm: "SHA-256",
    value: "a".repeat(64),
  },
  gates: [{ label: "Sample size", passed: false, value: "2 of 30 cases" }],
  limitations: ["Read-only export of the selected measurement context."],
  manifestVersion: "revrecovery-insights-evidence-manifest-v1",
  scope: {
    audience: "All invoice audiences",
    environment: "Test evidence (livemode = false)",
  },
  ...overrides,
});

describe("Insights evidence manifest verification", () => {
  it("reports an exact match for the current sanitized manifest", () => {
    const current = manifest();
    const result = verifyMeasurementEvidenceManifest(JSON.parse(JSON.stringify(current)), current);

    expect(result).toMatchObject({
      importedEvaluatedAt: current.evaluatedAt,
      status: "match",
      title: "Exact evidence match",
    });
    expect(result.checks.every((check) => check.outcome === "pass")).toBe(true);
  });

  it("reports a compatible historical manifest as stale", () => {
    const current = manifest();
    const historical = manifest({
      boundaries: {
        current: "2026-09-16T12:00:00.000Z ≤ created_at ≤ 2026-10-16T12:00:00.000Z",
        previous: "2026-08-17T12:00:00.000Z ≤ created_at < 2026-09-16T12:00:00.000Z",
      },
      evaluatedAt: "2026-10-16T12:00:00.000Z",
      fingerprint: { algorithm: "SHA-256", value: "b".repeat(64) },
    });
    const result = verifyMeasurementEvidenceManifest(historical, current);

    expect(result).toMatchObject({
      importedEvaluatedAt: historical.evaluatedAt,
      status: "stale",
      title: "Compatible manifest is stale",
    });
    expect(result.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Selected scope", outcome: "pass" }),
      expect.objectContaining({ label: "Cohort boundaries", outcome: "stale" }),
      expect.objectContaining({ label: "Evidence fingerprint", outcome: "stale" }),
    ]));
  });

  it("reports a differently scoped manifest as a mismatch", () => {
    const current = manifest();
    const result = verifyMeasurementEvidenceManifest(manifest({
      scope: {
        audience: "All invoice audiences",
        environment: "Live evidence (livemode = true)",
      },
    }), current);

    expect(result).toMatchObject({
      status: "mismatch",
      title: "Manifest does not match this view",
    });
    expect(result.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Selected scope", outcome: "fail" }),
    ]));
  });

  it("rejects an unsupported measurement contract", () => {
    const current = manifest();
    const result = verifyMeasurementEvidenceManifest(manifest({
      contractVersion: "revrecovery-insights-v0",
    }), current);

    expect(result).toMatchObject({
      status: "mismatch",
      title: "Manifest does not match this view",
    });
    expect(result.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Version and contract", outcome: "fail" }),
    ]));
  });

  it("rejects files with extra row-level fields", () => {
    const current = manifest();
    const result = verifyMeasurementEvidenceManifest({
      ...current,
      customer_id: "must-not-be-imported",
    }, current);

    expect(result).toMatchObject({
      status: "mismatch",
      title: "Manifest could not be verified",
    });
    expect(result.checks[0]).toMatchObject({
      label: "Manifest schema",
      outcome: "fail",
    });
    expect(JSON.stringify(result)).not.toContain("must-not-be-imported");
  });

  it("rejects invalid JSON without importing anything", () => {
    const result = verifyMeasurementEvidenceManifestJson("{not-json", manifest());

    expect(result).toMatchObject({
      importedEvaluatedAt: null,
      status: "mismatch",
      summary: expect.stringContaining("Nothing was imported or changed"),
    });
  });
});
