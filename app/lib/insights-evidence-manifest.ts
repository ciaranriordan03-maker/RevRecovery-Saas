export const INSIGHTS_MEASUREMENT_CONTRACT_VERSION = "revrecovery-insights-v1" as const;
export const INSIGHTS_MEASUREMENT_MANIFEST_VERSION = "revrecovery-insights-evidence-manifest-v1" as const;

export type MeasurementEvidenceExportManifest = {
  boundaries: {
    current: string;
    previous: string;
  };
  contractVersion: string;
  definitions: {
    label: string;
    value: string;
  }[];
  evaluatedAt: string;
  fingerprint: {
    algorithm: "SHA-256";
    value: string;
  };
  gates: {
    label: string;
    passed: boolean;
    value: string;
  }[];
  limitations: string[];
  manifestVersion: typeof INSIGHTS_MEASUREMENT_MANIFEST_VERSION;
  scope: {
    audience: string;
    environment: string;
  };
};

export type ManifestVerificationOutcome = "fail" | "pass" | "stale";
export type ManifestVerificationStatus = "match" | "mismatch" | "stale";

export type MeasurementManifestVerification = {
  checks: {
    label: string;
    outcome: ManifestVerificationOutcome;
    value: string;
  }[];
  importedEvaluatedAt: string | null;
  status: ManifestVerificationStatus;
  summary: string;
  title: string;
};

const ROOT_KEYS = [
  "boundaries",
  "contractVersion",
  "definitions",
  "evaluatedAt",
  "fingerprint",
  "gates",
  "limitations",
  "manifestVersion",
  "scope",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]) {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length && actual.every((key, index) => key === sortedExpected[index]);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoTimestamp(value: unknown): value is string {
  if (!isNonEmptyString(value)) {
    return false;
  }

  const timestamp = Date.parse(value);
  return !Number.isNaN(timestamp) && new Date(timestamp).toISOString() === value;
}

function isLabelValueRow(value: unknown) {
  return isRecord(value)
    && hasExactKeys(value, ["label", "value"])
    && isNonEmptyString(value.label)
    && isNonEmptyString(value.value);
}

function isGateRow(value: unknown) {
  return isRecord(value)
    && hasExactKeys(value, ["label", "passed", "value"])
    && isNonEmptyString(value.label)
    && typeof value.passed === "boolean"
    && isNonEmptyString(value.value);
}

function parseMeasurementManifest(value: unknown): {
  issue?: string;
  manifest?: MeasurementEvidenceExportManifest;
} {
  if (!isRecord(value) || !hasExactKeys(value, ROOT_KEYS)) {
    return { issue: "The file does not contain the exact sanitized manifest fields." };
  }

  if (!isRecord(value.boundaries)
    || !hasExactKeys(value.boundaries, ["current", "previous"])
    || !isNonEmptyString(value.boundaries.current)
    || !isNonEmptyString(value.boundaries.previous)) {
    return { issue: "The cohort boundaries are missing or malformed." };
  }

  if (!isRecord(value.scope)
    || !hasExactKeys(value.scope, ["audience", "environment"])
    || !isNonEmptyString(value.scope.audience)
    || !isNonEmptyString(value.scope.environment)) {
    return { issue: "The selected evidence scope is missing or malformed." };
  }

  if (!isRecord(value.fingerprint)
    || !hasExactKeys(value.fingerprint, ["algorithm", "value"])
    || value.fingerprint.algorithm !== "SHA-256"
    || typeof value.fingerprint.value !== "string"
    || !/^[0-9a-f]{64}$/.test(value.fingerprint.value)) {
    return { issue: "The evidence fingerprint is missing or malformed." };
  }

  if (!isNonEmptyString(value.contractVersion)
    || !isNonEmptyString(value.manifestVersion)
    || !isIsoTimestamp(value.evaluatedAt)) {
    return { issue: "The manifest version, contract version, or evaluation timestamp is invalid." };
  }

  if (!Array.isArray(value.definitions)
    || value.definitions.length === 0
    || !value.definitions.every(isLabelValueRow)) {
    return { issue: "The calculation definitions are missing or malformed." };
  }

  if (!Array.isArray(value.gates)
    || value.gates.length === 0
    || !value.gates.every(isGateRow)) {
    return { issue: "The evidence gate outcomes are missing or malformed." };
  }

  if (!Array.isArray(value.limitations)
    || value.limitations.length === 0
    || !value.limitations.every(isNonEmptyString)) {
    return { issue: "The evidence limitations are missing or malformed." };
  }

  return { manifest: value as unknown as MeasurementEvidenceExportManifest };
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }

  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(",")}}`;
  }

  return JSON.stringify(value);
}

function sameValue(left: unknown, right: unknown) {
  return stableSerialize(left) === stableSerialize(right);
}

function mismatchResult(summary: string, value: string): MeasurementManifestVerification {
  return {
    checks: [{ label: "Manifest schema", outcome: "fail", value }],
    importedEvaluatedAt: null,
    status: "mismatch",
    summary,
    title: "Manifest could not be verified",
  };
}

export function verifyMeasurementEvidenceManifest(
  input: unknown,
  current: MeasurementEvidenceExportManifest,
): MeasurementManifestVerification {
  const parsed = parseMeasurementManifest(input);

  if (!parsed.manifest) {
    return mismatchResult(
      "The selected file is not a supported sanitized RevRecovery evidence manifest. Nothing was imported or changed.",
      parsed.issue ?? "Unsupported manifest",
    );
  }

  const manifest = parsed.manifest;
  const manifestVersionMatches = manifest.manifestVersion === INSIGHTS_MEASUREMENT_MANIFEST_VERSION;
  const contractMatches = manifest.contractVersion === INSIGHTS_MEASUREMENT_CONTRACT_VERSION
    && current.contractVersion === INSIGHTS_MEASUREMENT_CONTRACT_VERSION;
  const algorithmMatches = manifest.fingerprint.algorithm === current.fingerprint.algorithm;
  const scopeMatches = sameValue(manifest.scope, current.scope);
  const compatible = manifestVersionMatches && contractMatches && algorithmMatches && scopeMatches;

  const compatibilityChecks: MeasurementManifestVerification["checks"] = [
    { label: "Manifest schema", outcome: "pass", value: "Sanitized manifest structure verified" },
    {
      label: "Version and contract",
      outcome: manifestVersionMatches && contractMatches && algorithmMatches ? "pass" : "fail",
      value: manifestVersionMatches && contractMatches && algorithmMatches
        ? `${manifest.manifestVersion} · ${manifest.contractVersion}`
        : "Unsupported manifest version, measurement contract, or fingerprint algorithm",
    },
    {
      label: "Selected scope",
      outcome: scopeMatches ? "pass" : "fail",
      value: scopeMatches
        ? `${manifest.scope.environment} · ${manifest.scope.audience}`
        : "The manifest environment or audience differs from this view",
    },
  ];

  if (!compatible) {
    return {
      checks: compatibilityChecks,
      importedEvaluatedAt: manifest.evaluatedAt,
      status: "mismatch",
      summary: "The file is structurally valid, but its contract or selected evidence scope is incompatible with the current view. It cannot verify this evidence.",
      title: "Manifest does not match this view",
    };
  }

  const boundariesMatch = sameValue(manifest.boundaries, current.boundaries);
  const evaluatedAtMatches = manifest.evaluatedAt === current.evaluatedAt;
  const fingerprintMatches = manifest.fingerprint.value === current.fingerprint.value;
  const fullManifestMatches = sameValue(manifest, current);
  const snapshotChecks: MeasurementManifestVerification["checks"] = [
    ...compatibilityChecks,
    {
      label: "Cohort boundaries",
      outcome: boundariesMatch ? "pass" : "stale",
      value: boundariesMatch ? "Current and previous boundaries match" : "Boundaries differ from the current evaluation",
    },
    {
      label: "Evaluation timestamp",
      outcome: evaluatedAtMatches ? "pass" : "stale",
      value: evaluatedAtMatches ? manifest.evaluatedAt : `Imported ${manifest.evaluatedAt}`,
    },
    {
      label: "Evidence fingerprint",
      outcome: fingerprintMatches ? "pass" : "stale",
      value: fingerprintMatches ? "SHA-256 fingerprint matches" : "Fingerprint differs from the current selected evidence",
    },
    {
      label: "Full sanitized record",
      outcome: fullManifestMatches ? "pass" : "stale",
      value: fullManifestMatches ? "Every exported field matches" : "One or more exported fields differ from the current view",
    },
  ];

  if (fullManifestMatches) {
    return {
      checks: snapshotChecks,
      importedEvaluatedAt: manifest.evaluatedAt,
      status: "match",
      summary: "This file is the exact sanitized evidence manifest for the currently selected Insights view.",
      title: "Exact evidence match",
    };
  }

  return {
    checks: snapshotChecks,
    importedEvaluatedAt: manifest.evaluatedAt,
    status: "stale",
    summary: "The file uses the same supported contract and evidence scope, but its snapshot differs from the current view. Treat it as historical evidence; this result does not prove tampering.",
    title: "Compatible manifest is stale",
  };
}

export function verifyMeasurementEvidenceManifestJson(
  text: string,
  current: MeasurementEvidenceExportManifest,
): MeasurementManifestVerification {
  try {
    return verifyMeasurementEvidenceManifest(JSON.parse(text), current);
  } catch {
    return mismatchResult(
      "The selected file is not valid JSON. Nothing was imported or changed.",
      "JSON could not be parsed",
    );
  }
}
