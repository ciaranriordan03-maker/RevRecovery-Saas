export const retentionCaseStatuses = [
  "detected",
  "intervention_pending",
  "intervention_sent",
  "saved",
  "canceled",
  "suppressed",
  "expired",
  "closed_without_intervention",
] as const;

export type RetentionCaseStatus = (typeof retentionCaseStatuses)[number];

export type SubscriptionChurnDisposition =
  | "active"
  | "cancellation_scheduled"
  | "canceled"
  | "ignored_nonvoluntary";

export type SubscriptionCancellationReason =
  | "cancellation_requested"
  | "payment_disputed"
  | "payment_failed"
  | "unknown";

export type SubscriptionChurnSignal = {
  cancelAt: number | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: number | null;
  cancellationReason: string | null;
  eventType: "customer.subscription.deleted" | "customer.subscription.updated";
  status: string;
};

export type SubscriptionChurnDecision = {
  cancellationReason: SubscriptionCancellationReason;
  cancellationType: "immediate" | "scheduled" | null;
  disposition: SubscriptionChurnDisposition;
};

function normalizeCancellationReason(
  reason: string | null,
): SubscriptionCancellationReason {
  if (
    reason === "cancellation_requested" ||
    reason === "payment_disputed" ||
    reason === "payment_failed"
  ) {
    return reason;
  }

  return "unknown";
}

export function decideSubscriptionChurn(
  signal: SubscriptionChurnSignal,
): SubscriptionChurnDecision {
  const cancellationReason = normalizeCancellationReason(
    signal.cancellationReason,
  );

  if (
    cancellationReason === "payment_disputed" ||
    cancellationReason === "payment_failed"
  ) {
    return {
      cancellationReason,
      cancellationType: null,
      disposition: "ignored_nonvoluntary",
    };
  }

  if (signal.eventType === "customer.subscription.deleted" || signal.status === "canceled") {
    return {
      cancellationReason,
      cancellationType: "immediate",
      disposition: "canceled",
    };
  }

  if (signal.cancelAtPeriodEnd || signal.cancelAt !== null) {
    return {
      cancellationReason,
      cancellationType: "scheduled",
      disposition: "cancellation_scheduled",
    };
  }

  return {
    cancellationReason,
    cancellationType: null,
    disposition: "active",
  };
}

