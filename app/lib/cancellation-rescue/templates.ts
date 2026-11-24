export const CANCELLATION_RESCUE_COPY_VERSION = "cancellation_rescue_draft_v1" as const;

export type CancellationRescueTemplate = {
  bodyPreview: string;
  messageKey: string;
  subject: string;
};

export const CANCELLATION_RESCUE_TEMPLATES: readonly CancellationRescueTemplate[] = [
  {
    messageKey: "cancellation_acknowledgement",
    subject: "A quick note about your {{product_name}} subscription",
    bodyPreview:
      "Hi {{customer_first_name}},\n\nYour {{product_name}} subscription is currently scheduled to end on {{scheduled_end_date}}. If that was unintended or you would prefer to keep it active, reply to this email and we will help.\n\n— {{sender_name}}",
  },
  {
    messageKey: "cancellation_check_in",
    subject: "Before your {{product_name}} subscription ends",
    bodyPreview:
      "Hi {{customer_first_name}},\n\nJust checking in before your {{product_name}} subscription ends on {{scheduled_end_date}}. If you would like to continue, reply and we will help with the next step.\n\n— {{sender_name}}",
  },
  {
    messageKey: "cancellation_final_reminder",
    subject: "Your {{product_name}} subscription is scheduled to end soon",
    bodyPreview:
      "Hi {{customer_first_name}},\n\nA final reminder that your {{product_name}} subscription is scheduled to end on {{scheduled_end_date}}. If you want to keep it active, reply before then and we will help.\n\n— {{sender_name}}",
  },
] as const;
