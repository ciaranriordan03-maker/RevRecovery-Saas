import { describe, expect, it } from "vitest";
import {
  CancellationReasonInputError,
  validateCancellationReasonInput,
} from "../app/lib/retention/cancellation-reasons";

describe("Phase 4 cancellation reason validation", () => {
  it("accepts a structured reason and normalizes optional comments", () => {
    expect(
      validateCancellationReasonInput({
        comment: "  We only need this seasonally.  ",
        reason: "temporary_pause",
      }),
    ).toEqual({
      comment: "We only need this seasonally.",
      reason: "temporary_pause",
    });
  });

  it("requires an explanation for the other reason", () => {
    expect(() =>
      validateCancellationReasonInput({ reason: "other" }),
    ).toThrowError(CancellationReasonInputError);
  });

  it("rejects unknown reasons and oversized comments", () => {
    expect(() =>
      validateCancellationReasonInput({ reason: "competitor_discount" }),
    ).toThrow("Choose a valid cancellation reason.");

    expect(() =>
      validateCancellationReasonInput({
        comment: "x".repeat(1_001),
        reason: "too_expensive",
      }),
    ).toThrow("1,000 characters or fewer");
  });
});
