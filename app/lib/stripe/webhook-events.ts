export const stripeWebhookEventTypes = [
  "account.application.deauthorized",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_succeeded",
  "invoice.updated",
  "customer.subscription.deleted",
  "customer.subscription.updated",
  "payment_method.updated",
] as const;

export type StripeWebhookEventType = (typeof stripeWebhookEventTypes)[number];
