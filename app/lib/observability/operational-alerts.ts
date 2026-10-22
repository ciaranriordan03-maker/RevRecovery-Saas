export type OperationalAlertCode =
  | "notification_reconciliation_required"
  | "notification_test_delivery_outcome_unknown"
  | "recovery_cron_failed"
  | "recovery_delivery_terminal_failed"
  | "recovery_delivery_unexpected_failed"
  | "resend_webhook_failed"
  | "stale_claim_detected"
  | "stripe_webhook_processing_failed";

export type OperationalAlertStage =
  | "claim"
  | "configuration"
  | "delivery"
  | "finalization"
  | "persistence"
  | "processing"
  | "provider"
  | "reconciliation";

type OperationalAlertPolicy = {
  area: "cron" | "delivery" | "reconciliation" | "webhook";
  code: OperationalAlertCode;
  level: "error" | "warning";
  operatorAction: string;
  route: "engineering" | "operator_and_engineering";
  thresholdCount: number;
  thresholdWindowMinutes: number;
};

export const OPERATIONAL_ALERT_POLICIES = {
  notification_reconciliation_required: {
    area: "reconciliation",
    code: "notification_reconciliation_required",
    level: "error",
    operatorAction:
      "Keep the event non-retryable, reconcile the accepted provider outcome, and forward-fix database finalization.",
    route: "operator_and_engineering",
    thresholdCount: 1,
    thresholdWindowMinutes: 5,
  },
  notification_test_delivery_outcome_unknown: {
    area: "delivery",
    code: "notification_test_delivery_outcome_unknown",
    level: "error",
    operatorAction:
      "Keep the event non-retryable and reconcile provider evidence before authorizing any later test.",
    route: "operator_and_engineering",
    thresholdCount: 1,
    thresholdWindowMinutes: 5,
  },
  recovery_cron_failed: {
    area: "cron",
    code: "recovery_cron_failed",
    level: "error",
    operatorAction:
      "Keep delivery disabled if the cause is unclear, inspect the failed run, and forward-fix before replay.",
    route: "operator_and_engineering",
    thresholdCount: 1,
    thresholdWindowMinutes: 5,
  },
  recovery_delivery_terminal_failed: {
    area: "delivery",
    code: "recovery_delivery_terminal_failed",
    level: "error",
    operatorAction:
      "Stop new delivery claims if failures are systemic and resolve the terminal configuration or provider condition.",
    route: "operator_and_engineering",
    thresholdCount: 3,
    thresholdWindowMinutes: 15,
  },
  recovery_delivery_unexpected_failed: {
    area: "delivery",
    code: "recovery_delivery_unexpected_failed",
    level: "warning",
    operatorAction:
      "Inspect the retry-safe failure group and stop new claims if the same unexpected failure repeats.",
    route: "engineering",
    thresholdCount: 3,
    thresholdWindowMinutes: 15,
  },
  resend_webhook_failed: {
    area: "webhook",
    code: "resend_webhook_failed",
    level: "error",
    operatorAction:
      "Verify webhook configuration and persistence health, then rely on provider replay only after the boundary is healthy.",
    route: "operator_and_engineering",
    thresholdCount: 1,
    thresholdWindowMinutes: 5,
  },
  stale_claim_detected: {
    area: "reconciliation",
    code: "stale_claim_detected",
    level: "warning",
    operatorAction:
      "Quarantine uncertain outcomes and inspect claim evidence; never retry until independent provider evidence is reconciled.",
    route: "engineering",
    thresholdCount: 2,
    thresholdWindowMinutes: 10,
  },
  stripe_webhook_processing_failed: {
    area: "webhook",
    code: "stripe_webhook_processing_failed",
    level: "error",
    operatorAction:
      "Inspect the retry ledger and forward-fix processing; do not replay while the same failure remains active.",
    route: "operator_and_engineering",
    thresholdCount: 3,
    thresholdWindowMinutes: 15,
  },
} satisfies Record<OperationalAlertCode, OperationalAlertPolicy>;

export type OperationalAlertInput = {
  code: OperationalAlertCode;
  context?: {
    attemptCount?: number;
    batchLimit?: number;
    httpStatus?: number;
    retryScheduled?: boolean;
    stage?: OperationalAlertStage;
  };
  error?: unknown;
};

export type RedactedOperationalAlert = {
  context: {
    attempt_count?: number;
    batch_limit?: number;
    customer_contact: "none";
    error_type: string;
    http_status?: number;
    operator_action: string;
    route: OperationalAlertPolicy["route"];
    retry_scheduled?: boolean;
    stage?: OperationalAlertStage;
    threshold_count: number;
    threshold_window_minutes: number;
  };
  fingerprint: ["revrecovery-operational", OperationalAlertCode];
  level: "error" | "warning";
  message: string;
  tags: {
    alert_code: OperationalAlertCode;
    alert_area: OperationalAlertPolicy["area"];
    customer_contact: "none";
    alert_route: OperationalAlertPolicy["route"];
  };
};

function boundedInteger(value: number | undefined, maximum: number) {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  return Math.min(Math.max(Math.trunc(value), 0), maximum);
}

function getErrorType(error: unknown) {
  if (error instanceof AggregateError) return "AggregateError";
  if (error instanceof EvalError) return "EvalError";
  if (error instanceof RangeError) return "RangeError";
  if (error instanceof ReferenceError) return "ReferenceError";
  if (error instanceof SyntaxError) return "SyntaxError";
  if (error instanceof TypeError) return "TypeError";
  if (error instanceof URIError) return "URIError";
  if (error instanceof Error) return "Error";
  return error === null ? "null" : typeof error;
}

export function buildRedactedOperationalAlert(
  input: OperationalAlertInput,
): RedactedOperationalAlert {
  const policy = OPERATIONAL_ALERT_POLICIES[input.code];
  const attemptCount = boundedInteger(input.context?.attemptCount, 10_000);
  const batchLimit = boundedInteger(input.context?.batchLimit, 1_000);
  const httpStatus = boundedInteger(input.context?.httpStatus, 599);

  return {
    context: {
      ...(attemptCount === undefined ? {} : { attempt_count: attemptCount }),
      ...(batchLimit === undefined ? {} : { batch_limit: batchLimit }),
      customer_contact: "none",
      error_type: getErrorType(input.error),
      ...(httpStatus === undefined ? {} : { http_status: httpStatus }),
      operator_action: policy.operatorAction,
      route: policy.route,
      ...(input.context?.retryScheduled === undefined
        ? {}
        : { retry_scheduled: input.context.retryScheduled }),
      ...(input.context?.stage === undefined
        ? {}
        : { stage: input.context.stage }),
      threshold_count: policy.thresholdCount,
      threshold_window_minutes: policy.thresholdWindowMinutes,
    },
    fingerprint: ["revrecovery-operational", input.code],
    level: policy.level,
    message: `RevRecovery operational signal: ${input.code}`,
    tags: {
      alert_area: policy.area,
      alert_code: input.code,
      alert_route: policy.route,
      customer_contact: "none",
    },
  };
}

export function dispatchRedactedOperationalAlert<T>(
  input: OperationalAlertInput,
  capture: (alert: RedactedOperationalAlert) => T,
) {
  return capture(buildRedactedOperationalAlert(input));
}
