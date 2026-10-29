import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("recovery case detail route", () => {
  it("loads a case by both tenant and case id", () => {
    const source = readFileSync(
      new URL("../app/lib/server/recovery-cases.ts", import.meta.url),
      "utf8",
    );
    expect(source).toContain("getRecoveryCaseById");
    expect(source).toContain('.eq("user_id", userId)');
    expect(source).toContain('.eq("id", failedPaymentId)');
  });

  it("rejects invalid or inaccessible identifiers with a not-found response", () => {
    const source = readFileSync(
      new URL("../app/dashboard/cases/[id]/page.tsx", import.meta.url),
      "utf8",
    );
    expect(source).toContain("UUID_PATTERN.test(id)");
    expect(source.match(/notFound\(\)/g)).toHaveLength(2);
  });

  it("links case rows to the tenant-protected detail route", () => {
    const source = readFileSync(
      new URL("../app/components/dashboard/cases-content.tsx", import.meta.url),
      "utf8",
    );
    expect(source).toContain("`/dashboard/cases/${item.id}`");
  });

  it("describes the email stage as manually paused when the case is paused", () => {
    const source = readFileSync(
      new URL("../app/components/dashboard/case-detail-content.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("recoveryCase.manuallyPausedAt");
    expect(source).toContain("Recovery emails manually paused");
  });

  it("does not imply an unscheduled detected case has email controls or a pending message", () => {
    const source = readFileSync(
      new URL("../app/components/dashboard/case-detail-content.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain('recoveryCase.caseStatus !== "detected"');
    expect(source).toContain("No recovery email has been scheduled");
  });

  it("shows failure-specific communication guidance without claiming automation", () => {
    const source = readFileSync(
      new URL("../app/components/dashboard/case-detail-content.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("Communication guidance");
    expect(source).toContain("recoveryCase.customerAction");
    expect(source).toContain("recoveryCase.merchantAction");
    expect(source).toContain("recoveryCase.retryGuidance");
    expect(source).toContain("Advisory only");
  });

  it("shows a failure-specific email preview without saving it", () => {
    const source = readFileSync(
      new URL("../app/components/dashboard/case-detail-content.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("Suggested first-email treatment");
    expect(source).toContain("buildFailureSpecificEmailPreview");
    expect(source).toContain("Not saved");
    expect(source).toContain("does not modify the account template");
  });

  it("shows a read-only Stripe retry and email timing evaluation", () => {
    const source = readFileSync(
      new URL("../app/components/dashboard/case-detail-content.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("evaluateRetryEmailOverlap");
    expect(source).toContain("Recovery coordination");
    expect(source).toContain("Read only");
    expect(source).toContain("does not automatically change any schedules");
  });

  it("shows recovery-window and sequence-exhaustion facts without controls", () => {
    const source = readFileSync(
      new URL("../app/components/dashboard/case-detail-content.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("Recovery window");
    expect(source).toContain("recoveryCase.remainingMessageCount");
    expect(source).toContain("recoveryCase.scheduledMessageCount");
    expect(source).toContain("recoveryCase.recoveryWindowEndsAt");
    expect(source).toContain("The case is not marked exhausted.");
    expect(source).toContain("has not changed this case&apos;s schedule or status");
  });

  it("keeps synthetic sandbox wording conditional on recorded test evidence", () => {
    const source = readFileSync(
      new URL("../app/components/dashboard/case-detail-content.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain('event.sourceEventId?.startsWith("rr_test_evt_")');
    expect(source).toContain("hasSyntheticTestEvidence");
    expect(source).toContain("Recorded sandbox evidence; no Stripe payment was attempted.");
  });

  it("uses accessible responsive disclosures for secondary mobile detail", () => {
    const source = readFileSync(
      new URL("../app/components/dashboard/case-detail-disclosure.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("aria-controls");
    expect(source).toContain("aria-expanded");
    expect(source).toContain("lg:hidden");
    expect(source).toContain("lg:block");
  });

  it("provides loading, recoverable error, and not-found route states", () => {
    const loading = readFileSync(
      new URL("../app/dashboard/cases/[id]/loading.tsx", import.meta.url),
      "utf8",
    );
    const error = readFileSync(
      new URL("../app/dashboard/cases/[id]/error.tsx", import.meta.url),
      "utf8",
    );
    const notFoundState = readFileSync(
      new URL("../app/dashboard/cases/[id]/not-found.tsx", import.meta.url),
      "utf8",
    );

    expect(loading).toContain("CaseDetailLoadingSkeleton");
    expect(error).toContain("Your saved recovery data has not changed");
    expect(error).toContain("onClick={reset}");
    expect(notFoundState).toContain("Case not found");
    expect(notFoundState).toContain("not accessible");
  });

  it("replaces browser confirmation with an accessible saved-state dialog", () => {
    const source = readFileSync(
      new URL("../app/components/dashboard/case-manual-actions.tsx", import.meta.url),
      "utf8",
    );

    expect(source).not.toContain("window.confirm");
    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain("changedMessages");
    expect(source).toContain("Nothing changed.");
  });
});
