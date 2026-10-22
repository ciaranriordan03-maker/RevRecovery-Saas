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
    expect(source).toContain("Stripe coordination");
    expect(source).toContain("Read only");
    expect(source).toContain("has not changed the email schedule");
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
});
