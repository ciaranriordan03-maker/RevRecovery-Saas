export type WebhookStoredStatus =
  | "received"
  | "processing"
  | "processed"
  | "failed"
  | "ignored";

export type WebhookClaimDisposition =
  | "claimable_later"
  | "completed"
  | "in_progress"
  | "unknown";

export function getWebhookClaimDisposition(
  status: WebhookStoredStatus | null,
): WebhookClaimDisposition {
  if (status === "processed" || status === "ignored") {
    return "completed";
  }

  if (status === "processing") {
    return "in_progress";
  }

  if (status === "received" || status === "failed") {
    return "claimable_later";
  }

  return "unknown";
}

export function getWebhookRetryDelaySeconds(attemptCount: number) {
  const normalizedAttempt = Math.max(1, Math.floor(attemptCount));
  return Math.min(15 * 60, 30 * 2 ** (normalizedAttempt - 1));
}

export function sanitizeWebhookError(error: unknown) {
  return {
    code: "WEBHOOK_PROCESSING_FAILED",
    details: {
      error_type: error instanceof Error ? error.name : "UnknownError",
    },
  };
}
