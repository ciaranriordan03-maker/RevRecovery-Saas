export const RETRY_EMAIL_REVIEW_WINDOW_MINUTES = 12 * 60;

export type RetryEmailOverlapEvaluation = {
  detail: string;
  distanceMinutes: number | null;
  emailRelation: "after" | "before" | "same_time" | null;
  status: "clear" | "review" | "unavailable";
  title: string;
};

function parseTimestamp(value: string | null) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function formatDistance(minutes: number) {
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours} ${hours === 1 ? "hour" : "hours"}`;

  return `${hours}h ${remainingMinutes}m`;
}

export function evaluateRetryEmailOverlap({
  nextEmailAt,
  nextPaymentAttemptAt,
}: {
  nextEmailAt: string | null;
  nextPaymentAttemptAt: string | null;
}): RetryEmailOverlapEvaluation {
  const emailTimestamp = parseTimestamp(nextEmailAt);
  const retryTimestamp = parseTimestamp(nextPaymentAttemptAt);

  if (emailTimestamp === null || retryTimestamp === null) {
    return {
      detail: "A comparison requires both a scheduled RevRecovery email and Stripe's next recorded retry.",
      distanceMinutes: null,
      emailRelation: null,
      status: "unavailable",
      title: "Timing comparison unavailable",
    };
  }

  const signedDistanceMinutes = Math.round((emailTimestamp - retryTimestamp) / 60_000);
  const distanceMinutes = Math.abs(signedDistanceMinutes);
  const emailRelation = signedDistanceMinutes === 0
    ? "same_time"
    : signedDistanceMinutes < 0
      ? "before"
      : "after";
  const distanceLabel = formatDistance(distanceMinutes);

  if (distanceMinutes <= RETRY_EMAIL_REVIEW_WINDOW_MINUTES) {
    const relationCopy = emailRelation === "same_time"
      ? "at the same time as"
      : `${distanceLabel} ${emailRelation}`;

    return {
      detail: `The next recovery email is scheduled ${relationCopy} Stripe's next retry. Review the timing to avoid confusing or unnecessary contact.`,
      distanceMinutes,
      emailRelation,
      status: "review",
      title: "Email and Stripe retry are close together",
    };
  }

  return {
    detail: `The next recovery email is scheduled ${distanceLabel} ${emailRelation} Stripe's next retry, outside the 12-hour review window.`,
    distanceMinutes,
    emailRelation,
    status: "clear",
    title: "No close timing overlap detected",
  };
}
