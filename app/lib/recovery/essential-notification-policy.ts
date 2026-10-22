export type EssentialNotificationRule = {
  cooldownLabel: string;
  description: string;
  id: "attention_digest" | "sending_domain_failure" | "webhook_failure";
  severity: "critical" | "warning";
  title: string;
  trigger: string;
};

export const ESSENTIAL_NOTIFICATION_RULES: EssentialNotificationRule[] = [
  {
    cooldownLabel: "At most once per hour for the same unresolved failure",
    description: "Alerts when Stripe events cannot be processed, because new failed payments or recoveries may stop updating.",
    id: "webhook_failure",
    severity: "critical",
    title: "Stripe event processing failed",
    trigger: "A Stripe webhook event reaches a failed processing state.",
  },
  {
    cooldownLabel: "Once per state change, then no more than once every 24 hours",
    description: "Alerts when the verified customer-facing sender becomes failed or disabled and recovery delivery may be affected.",
    id: "sending_domain_failure",
    severity: "critical",
    title: "Recovery sending domain needs attention",
    trigger: "The sending domain changes to failed or disabled.",
  },
  {
    cooldownLabel: "One digest per day, only when the queue contains new or changed cases",
    description: "Summarises exhausted sequences and recorded email-delivery problems without sending one alert per customer.",
    id: "attention_digest",
    severity: "warning",
    title: "Needs-attention daily digest",
    trigger: "At least one recovery case newly enters or changes within the needs-attention queue.",
  },
];

export const ESSENTIAL_NOTIFICATION_EXCLUSIONS = [
  "No alert for every failed payment.",
  "No alert for every recovered payment.",
  "No repeated alert while the same issue remains unchanged inside its cooldown.",
] as const;

export function buildEssentialNotificationPreview(accountEmail: string) {
  return {
    exclusions: ESSENTIAL_NOTIFICATION_EXCLUSIONS,
    recipient: accountEmail,
    rules: ESSENTIAL_NOTIFICATION_RULES,
  };
}
