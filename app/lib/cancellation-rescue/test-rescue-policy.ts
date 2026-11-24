export const CANCELLATION_TEST_RESCUE_ALLOWED_STATUSES = [
  "active",
  "past_due",
  "trialing",
  "unpaid",
] as const;

export type CancellationTestRescuePolicyFailure =
  | "customer_mismatch"
  | "environment_mismatch"
  | "invalid_scheduled_end"
  | "not_scheduled_for_cancellation"
  | "subscription_mismatch"
  | "subscription_status_not_supported";

export type CancellationTestRescueSubscription = {
  cancelAtPeriodEnd: boolean;
  livemode: boolean;
  scheduledEndEpochSeconds: number | null;
  status: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string;
};

export function evaluateCancellationTestRescueSubscription({
  expectedCustomerId,
  expectedSubscriptionId,
  nowEpochSeconds,
  subscription,
}: {
  expectedCustomerId: string;
  expectedSubscriptionId: string;
  nowEpochSeconds: number;
  subscription: CancellationTestRescueSubscription;
}): { eligible: true } | { eligible: false; reason: CancellationTestRescuePolicyFailure } {
  if (subscription.livemode) {
    return { eligible: false, reason: "environment_mismatch" };
  }

  if (subscription.stripeSubscriptionId !== expectedSubscriptionId) {
    return { eligible: false, reason: "subscription_mismatch" };
  }

  if (subscription.stripeCustomerId !== expectedCustomerId) {
    return { eligible: false, reason: "customer_mismatch" };
  }

  if (!subscription.cancelAtPeriodEnd) {
    return { eligible: false, reason: "not_scheduled_for_cancellation" };
  }

  if (
    !CANCELLATION_TEST_RESCUE_ALLOWED_STATUSES.includes(
      subscription.status as (typeof CANCELLATION_TEST_RESCUE_ALLOWED_STATUSES)[number],
    )
  ) {
    return { eligible: false, reason: "subscription_status_not_supported" };
  }

  if (
    !subscription.scheduledEndEpochSeconds ||
    !Number.isFinite(subscription.scheduledEndEpochSeconds) ||
    subscription.scheduledEndEpochSeconds <= nowEpochSeconds
  ) {
    return { eligible: false, reason: "invalid_scheduled_end" };
  }

  return { eligible: true };
}
