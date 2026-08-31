export const RECOVERY_MESSAGE_TEMPLATES = [
  {
    bodyPreview:
      "Your latest invoice payment did not go through. Update your payment details to avoid service interruption.",
    messageKey: "email_1",
    subject: "Action needed: update your payment method",
  },
  {
    bodyPreview:
      "We will retry your payment soon. Update your billing details now to keep access uninterrupted.",
    messageKey: "email_2",
    subject: "Reminder: your payment is still outstanding",
  },
  {
    bodyPreview:
      "This is the final reminder before access may be impacted. Please update your payment method today.",
    messageKey: "email_3",
    subject: "Final reminder: prevent service interruption",
  },
] as const;
