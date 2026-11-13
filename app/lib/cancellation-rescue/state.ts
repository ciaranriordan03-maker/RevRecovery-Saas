import type Stripe from "stripe";

export const CANCELLATION_RESCUE_MODES = [
  "disabled",
  "shadow",
  "test",
  "approval_required",
  "live",
] as const;

export type CancellationRescueMode =
  (typeof CANCELLATION_RESCUE_MODES)[number];

export const CANCELLATION_CASE_STATUSES = [
  "shadow",
  "reversed",
  "terminated",
  "expired",
  "ineligible",
  "failed_operationally",
] as const;

export type CancellationCaseStatus =
  (typeof CANCELLATION_CASE_STATUSES)[number];

export type CancellationEventDecision =
  | "create_episode"
  | "ignore_stale"
  | "noop"
  | "reverse_episode"
  | "terminate_episode"
  | "update_episode";

export function decideCancellationEvent({
  cancelAtPeriodEnd,
  caseIsOpen,
  eventCreatedAt,
  eventType,
  lastEventCreatedAt,
  previousCancelAtPeriodEnd,
}: {
  cancelAtPeriodEnd: boolean;
  caseIsOpen: boolean;
  eventCreatedAt: string;
  eventType: "customer.subscription.deleted" | "customer.subscription.updated";
  lastEventCreatedAt: string | null;
  previousCancelAtPeriodEnd: boolean | null;
}): CancellationEventDecision {
  if (
    lastEventCreatedAt &&
    new Date(eventCreatedAt).getTime() < new Date(lastEventCreatedAt).getTime()
  ) {
    return "ignore_stale";
  }

  if (eventType === "customer.subscription.deleted") {
    return caseIsOpen ? "terminate_episode" : "noop";
  }

  if (cancelAtPeriodEnd && previousCancelAtPeriodEnd !== true) {
    return "create_episode";
  }

  if (cancelAtPeriodEnd && previousCancelAtPeriodEnd === true) {
    return caseIsOpen ? "update_episode" : "create_episode";
  }

  if (!cancelAtPeriodEnd && previousCancelAtPeriodEnd === true && caseIsOpen) {
    return "reverse_episode";
  }

  return "noop";
}

type CompatibleSubscription = Stripe.Subscription & {
  cancel_at?: number | null;
  canceled_at?: number | null;
  cancellation_details?: {
    comment?: string | null;
    feedback?: string | null;
    reason?: string | null;
  } | null;
  current_period_end?: number | null;
};

export type CancellationSubscriptionSnapshot = {
  cancelAt: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  cancellationComment: string | null;
  cancellationFeedback: string | null;
  cancellationReason: string | null;
  currency: string | null;
  currentPeriodEnd: string | null;
  recurringInterval: string | null;
  recurringIntervalCount: number | null;
  recurringValueCents: number | null;
  recurringValueSource: "subscription_items_list_price" | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
};

function toIsoTimestamp(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? new Date(value * 1000).toISOString()
    : null;
}

function getCustomerId(customer: CompatibleSubscription["customer"]) {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

function getRecurringValue(subscription: CompatibleSubscription) {
  const items = subscription.items?.data ?? [];

  if (items.length === 0) {
    return {
      currency: null,
      recurringInterval: null,
      recurringIntervalCount: null,
      recurringValueCents: null,
      recurringValueSource: null,
    } as const;
  }

  let total = 0;
  let currency: string | null = null;
  let interval: string | null = null;
  let intervalCount: number | null = null;

  for (const item of items) {
    const price = item.price;
    const quantity = item.quantity ?? 1;
    const recurring = price.recurring;

    if (
      !recurring ||
      price.billing_scheme !== "per_unit" ||
      !Number.isSafeInteger(price.unit_amount) ||
      !Number.isSafeInteger(quantity) ||
      quantity <= 0
    ) {
      return {
        currency: null,
        recurringInterval: null,
        recurringIntervalCount: null,
        recurringValueCents: null,
        recurringValueSource: null,
      } as const;
    }

    if (
      (currency && currency !== price.currency) ||
      (interval && interval !== recurring.interval) ||
      (intervalCount && intervalCount !== recurring.interval_count)
    ) {
      return {
        currency: null,
        recurringInterval: null,
        recurringIntervalCount: null,
        recurringValueCents: null,
        recurringValueSource: null,
      } as const;
    }

    currency = price.currency;
    interval = recurring.interval;
    intervalCount = recurring.interval_count;
    total += (price.unit_amount ?? 0) * quantity;
  }

  if (!Number.isSafeInteger(total) || total < 0 || !currency || !interval) {
    return {
      currency: null,
      recurringInterval: null,
      recurringIntervalCount: null,
      recurringValueCents: null,
      recurringValueSource: null,
    } as const;
  }

  return {
    currency,
    recurringInterval: interval,
    recurringIntervalCount: intervalCount,
    recurringValueCents: total,
    recurringValueSource: "subscription_items_list_price",
  } as const;
}

export function getCancellationSubscriptionSnapshot(
  source: Stripe.Subscription,
): CancellationSubscriptionSnapshot {
  const subscription = source as CompatibleSubscription;
  const recurringValue = getRecurringValue(subscription);

  return {
    cancelAt: toIsoTimestamp(subscription.cancel_at),
    cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
    canceledAt: toIsoTimestamp(subscription.canceled_at),
    cancellationComment: subscription.cancellation_details?.comment ?? null,
    cancellationFeedback: subscription.cancellation_details?.feedback ?? null,
    cancellationReason: subscription.cancellation_details?.reason ?? null,
    currency: recurringValue.currency,
    currentPeriodEnd: toIsoTimestamp(subscription.current_period_end),
    recurringInterval: recurringValue.recurringInterval,
    recurringIntervalCount: recurringValue.recurringIntervalCount,
    recurringValueCents: recurringValue.recurringValueCents,
    recurringValueSource: recurringValue.recurringValueSource,
    stripeCustomerId: getCustomerId(subscription.customer),
    stripeSubscriptionId: subscription.id?.trim() || null,
    subscriptionStatus: subscription.status ?? null,
  };
}
