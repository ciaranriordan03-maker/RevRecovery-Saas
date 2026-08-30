export const MAX_RECOVERY_DELIVERY_ATTEMPTS = 5;

const BASE_RETRY_DELAY_SECONDS = 60;
const MAX_RETRY_DELAY_SECONDS = 6 * 60 * 60;

export type DeliveryFailureDisposition = "retryable" | "terminal";

export function getRecoveryDeliveryRetryDelaySeconds(attemptNumber: number) {
  const exponent = Math.max(0, attemptNumber - 1);

  return Math.min(
    BASE_RETRY_DELAY_SECONDS * 2 ** exponent,
    MAX_RETRY_DELAY_SECONDS,
  );
}

export function getRecoveryDeliveryNextAttemptAt(
  attemptNumber: number,
  now = new Date(),
) {
  return new Date(
    now.getTime() + getRecoveryDeliveryRetryDelaySeconds(attemptNumber) * 1000,
  ).toISOString();
}

export function classifyDeliveryHttpFailure(
  status: number,
): DeliveryFailureDisposition {
  if (status === 408 || status === 409 || status === 425 || status === 429) {
    return "retryable";
  }

  return status >= 500 ? "retryable" : "terminal";
}

export function shouldRetryRecoveryDelivery(
  disposition: DeliveryFailureDisposition,
  attemptNumber: number,
) {
  return (
    disposition === "retryable" &&
    attemptNumber < MAX_RECOVERY_DELIVERY_ATTEMPTS
  );
}
