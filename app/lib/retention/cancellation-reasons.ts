export const cancellationReasonCodes = [
  "too_expensive",
  "missing_features",
  "technical_issues",
  "support_issues",
  "billing_issues",
  "not_using_enough",
  "temporary_pause",
  "switched_provider",
  "business_closed",
  "other",
  "prefer_not_to_say",
] as const;

export type CancellationReasonCode = (typeof cancellationReasonCodes)[number];

export const cancellationReasonOptions: ReadonlyArray<{
  code: CancellationReasonCode;
  label: string;
}> = [
  { code: "too_expensive", label: "It is too expensive" },
  { code: "missing_features", label: "It is missing features I need" },
  { code: "technical_issues", label: "I am having technical problems" },
  { code: "support_issues", label: "I need more help or support" },
  { code: "billing_issues", label: "I have a billing issue" },
  { code: "not_using_enough", label: "I am not using it enough" },
  { code: "temporary_pause", label: "I only need to stop temporarily" },
  { code: "switched_provider", label: "I switched to another provider" },
  { code: "business_closed", label: "My business or project has closed" },
  { code: "other", label: "Another reason" },
  { code: "prefer_not_to_say", label: "I prefer not to say" },
];

export const MAX_CANCELLATION_COMMENT_LENGTH = 1_000;

export type CancellationReasonInput = {
  comment?: unknown;
  reason?: unknown;
};

export type ValidatedCancellationReason = {
  comment: string | null;
  reason: CancellationReasonCode;
};

export class CancellationReasonInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CancellationReasonInputError";
  }
}

export function isCancellationReasonCode(
  value: unknown,
): value is CancellationReasonCode {
  return (
    typeof value === "string" &&
    cancellationReasonCodes.includes(value as CancellationReasonCode)
  );
}

export function validateCancellationReasonInput(
  input: CancellationReasonInput,
): ValidatedCancellationReason {
  if (!isCancellationReasonCode(input.reason)) {
    throw new CancellationReasonInputError("Choose a valid cancellation reason.");
  }

  if (input.comment !== undefined && typeof input.comment !== "string") {
    throw new CancellationReasonInputError("Cancellation comments must be text.");
  }

  const comment = typeof input.comment === "string" ? input.comment.trim() : "";

  if (comment.length > MAX_CANCELLATION_COMMENT_LENGTH) {
    throw new CancellationReasonInputError(
      "Cancellation comments must be 1,000 characters or fewer.",
    );
  }

  if (input.reason === "other" && comment.length === 0) {
    throw new CancellationReasonInputError(
      "Add a short explanation when choosing another reason.",
    );
  }

  return {
    comment: comment.length > 0 ? comment : null,
    reason: input.reason,
  };
}
