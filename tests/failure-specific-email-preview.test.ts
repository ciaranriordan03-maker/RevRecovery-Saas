import { describe, expect, it } from "vitest";
import { RECOVERY_FAILURE_CATEGORIES } from "../app/lib/recovery/decline-diagnostics";
import { buildFailureSpecificEmailPreview } from "../app/lib/recovery/failure-specific-email-preview";

describe("failure-specific email preview", () => {
  it.each(RECOVERY_FAILURE_CATEGORIES)("provides complete safe copy for %s", (category) => {
    const preview = buildFailureSpecificEmailPreview({
      category,
      nextRetryLabel: null,
    });

    expect(preview.subject).not.toBe("");
    expect(preview.contextLine).not.toBe("");
    expect(preview.actionLine).not.toBe("");
    expect(preview.retryLine).not.toBe("");
    expect(preview.rationale).not.toBe("");
  });

  it("uses Stripe's known retry timing without promising success", () => {
    const preview = buildFailureSpecificEmailPreview({
      category: "insufficient_funds",
      nextRetryLabel: "Oct 14, 2026, 10:00 AM",
    });

    expect(preview.retryLine).toContain("Oct 14, 2026, 10:00 AM");
    expect(preview.retryLine).toContain("not guaranteed");
    expect(preview.retryLine).not.toContain("RevRecovery");
  });

  it("does not tell a security-decline customer that fraud occurred", () => {
    const preview = buildFailureSpecificEmailPreview({
      category: "fraud_or_security",
      nextRetryLabel: null,
    });

    expect(`${preview.subject} ${preview.contextLine} ${preview.actionLine}`.toLowerCase()).not.toContain("fraud");
  });

  it("keeps unknown failures explicit instead of inventing a cause", () => {
    const preview = buildFailureSpecificEmailPreview({
      category: "unknown",
      nextRetryLabel: null,
    });

    expect(preview.contextLine).toContain("did not provide a specific reason");
  });
});
