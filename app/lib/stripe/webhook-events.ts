export const stripeWebhookEventTypes = [
  "invoice.payment_failed",
  "invoice.payment_succeeded",
  "customer.subscription.deleted",
  "customer.subscription.updated",
  "payment_method.updated",
] as const;

export type StripeWebhookEventType = (typeof stripeWebhookEventTypes)[number];
