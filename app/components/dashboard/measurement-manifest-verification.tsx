"use client";

import { useState, type ChangeEvent } from "react";
import {
  verifyMeasurementEvidenceManifestJson,
  type MeasurementEvidenceExportManifest,
  type MeasurementManifestVerification,
} from "../../lib/insights-evidence-manifest";

const MAX_MANIFEST_BYTES = 128 * 1024;

type VerificationState =
  | { kind: "idle" }
  | { kind: "checking"; filename: string }
  | { filename: string; kind: "result"; result: MeasurementManifestVerification };

const statusClasses = {
  match: "border-[var(--success-badge)] bg-[var(--success-soft)]",
  mismatch: "border-[var(--danger)] bg-[var(--danger-soft)]",
  stale: "border-[var(--warning)] bg-[var(--warning-soft)]",
} as const;

const statusLabels = {
  match: "Match",
  mismatch: "Mismatch",
  stale: "Stale",
} as const;

const outcomeClasses = {
  fail: "bg-[var(--danger-soft)] text-[var(--danger)]",
  pass: "bg-[var(--success-soft)] text-[var(--success)]",
  stale: "bg-[var(--warning-soft)] text-[var(--warning-text)]",
} as const;

function oversizedResult(): MeasurementManifestVerification {
  return {
    checks: [{
      label: "File size",
      outcome: "fail",
      value: "Manifest exceeds the 128 KB local verification limit",
    }],
    importedEvaluatedAt: null,
    status: "mismatch",
    summary: "The selected file is too large to be a sanitized RevRecovery evidence manifest. Nothing was imported or changed.",
    title: "Manifest could not be verified",
  };
}

function unreadableResult(): MeasurementManifestVerification {
  return {
    checks: [{
      label: "Local file read",
      outcome: "fail",
      value: "The browser could not read the selected file",
    }],
    importedEvaluatedAt: null,
    status: "mismatch",
    summary: "The selected file could not be read locally. Nothing was uploaded, imported, or changed.",
    title: "Manifest could not be verified",
  };
}

export function MeasurementManifestVerification({
  currentManifest,
}: {
  currentManifest: MeasurementEvidenceExportManifest;
}) {
  const [state, setState] = useState<VerificationState>({ kind: "idle" });

  async function handleManifestChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setState({ kind: "idle" });
      return;
    }

    if (file.size > MAX_MANIFEST_BYTES) {
      setState({ filename: file.name, kind: "result", result: oversizedResult() });
      return;
    }

    setState({ filename: file.name, kind: "checking" });
    try {
      const result = verifyMeasurementEvidenceManifestJson(await file.text(), currentManifest);
      setState({ filename: file.name, kind: "result", result });
    } catch {
      setState({ filename: file.name, kind: "result", result: unreadableResult() });
    }
  }

  return (
    <section
      aria-labelledby="manifest-verification-heading"
      className="mt-5 rounded-[10px] border border-[var(--border)] bg-[var(--background)] p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.04em] text-[var(--muted)]">
            Manifest verification
          </p>
          <h3 className="mt-1 text-sm font-medium text-[var(--foreground)]" id="manifest-verification-heading">
            Check an exported evidence record
          </h3>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--muted-strong)]">
            Compare a previously exported manifest with this exact view and report match, stale, or mismatch status.
          </p>
        </div>
        <span className="w-fit rounded-[8px] bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-medium text-[var(--muted-strong)]">
          Read only
        </span>
      </div>

      <label className="mt-4 block text-xs font-medium text-[var(--foreground)]" htmlFor="measurement-manifest-file">
        Evidence manifest JSON
      </label>
      <input
        accept=".json,application/json"
        aria-describedby="manifest-verification-privacy"
        className="mt-2 block w-full rounded-[8px] border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--muted-strong)] file:mr-3 file:rounded-[8px] file:border-0 file:bg-[var(--primary-soft)] file:px-3 file:py-2 file:text-xs file:font-medium file:text-[var(--primary)]"
        disabled={state.kind === "checking"}
        id="measurement-manifest-file"
        onChange={handleManifestChange}
        type="file"
      />
      <p className="mt-2 text-xs leading-5 text-[var(--muted)]" id="manifest-verification-privacy">
        The file is read only in this browser. It is not uploaded, stored, imported, or used to change calculations.
      </p>

      <div aria-live="polite" className="mt-4">
        {state.kind === "idle" ? (
          <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-3">
            <p className="text-xs font-medium text-[var(--foreground)]">No manifest checked</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              Choose a D5j JSON export to compare it with the current server-generated evidence fingerprint and scope.
            </p>
          </div>
        ) : null}

        {state.kind === "checking" ? (
          <div className="rounded-[8px] border border-[var(--primary-border)] bg-[var(--primary-soft)] p-3">
            <p className="text-xs font-medium text-[var(--primary-text)]">Checking {state.filename}…</p>
          </div>
        ) : null}

        {state.kind === "result" ? (
          <div className={`rounded-[8px] border p-4 ${statusClasses[state.result.status]}`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="break-all text-xs text-[var(--muted)]">{state.filename}</p>
                <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{state.result.title}</p>
              </div>
              <span className={`w-fit rounded-[8px] px-2 py-1 text-xs font-medium ${outcomeClasses[state.result.status === "match" ? "pass" : state.result.status === "stale" ? "stale" : "fail"]}`}>
                {statusLabels[state.result.status]}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--muted-strong)]">{state.result.summary}</p>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              {state.result.checks.map((check) => (
                <div className="rounded-[8px] bg-[var(--surface)] p-3" key={check.label}>
                  <div className="flex items-start justify-between gap-2">
                    <dt className="text-xs font-medium text-[var(--foreground)]">{check.label}</dt>
                    <span className={`rounded-[8px] px-2 py-0.5 text-xs font-medium ${outcomeClasses[check.outcome]}`}>
                      {check.outcome === "pass" ? "Pass" : check.outcome === "stale" ? "Stale" : "Fail"}
                    </span>
                  </div>
                  <dd className="mt-1 break-words text-xs leading-5 text-[var(--muted-strong)]">{check.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </div>
    </section>
  );
}
