export const RECOVERY_MESSAGE_KEYS = ["email_1", "email_2", "email_3"] as const;

export type RecoveryMessageKey = (typeof RECOVERY_MESSAGE_KEYS)[number];

export type RecoveryMessageTemplate = {
  bodyPreview: string;
  messageKey: RecoveryMessageKey;
  subject: string;
};

export const RECOVERY_MESSAGE_COPY_VERSION = "settings_v1";

export const RECOVERY_MESSAGE_TEMPLATES: RecoveryMessageTemplate[] = [
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
];

const TONE_BODY_PRESETS: Record<string, readonly string[]> = {
  Professional: [
    "We were unable to process your latest invoice payment. Please update your payment details to avoid an interruption.",
    "Your invoice payment remains outstanding. Please update your billing details before the next retry.",
    "Your invoice payment is still outstanding. Please update your payment method today to avoid service interruption.",
  ],
  Urgent: [
    "Your payment requires attention. Update your payment details now so we can retry the charge.",
    "Your payment is still outstanding. Update your billing details now to avoid service interruption.",
    "Final notice: update your payment method today to prevent service interruption.",
  ],
};

export function cloneRecoveryMessageTemplates(
  templates: readonly RecoveryMessageTemplate[] = RECOVERY_MESSAGE_TEMPLATES,
) {
  return templates.map((template) => ({ ...template }));
}

export function getRecoveryMessageTemplatesForTone(tone: string) {
  const bodies = TONE_BODY_PRESETS[tone];

  return RECOVERY_MESSAGE_TEMPLATES.map((template, index) => ({
    ...template,
    bodyPreview: bodies?.[index] ?? template.bodyPreview,
  }));
}

export function normalizeRecoveryMessageTemplates(source: unknown) {
  if (!Array.isArray(source)) {
    return cloneRecoveryMessageTemplates();
  }

  return RECOVERY_MESSAGE_KEYS.map((messageKey) => {
    const candidate = source.find(
      (value) =>
        value &&
        typeof value === "object" &&
        "messageKey" in value &&
        value.messageKey === messageKey,
    );

    return {
      bodyPreview:
        candidate && "bodyPreview" in candidate && typeof candidate.bodyPreview === "string"
          ? candidate.bodyPreview
          : "",
      messageKey,
      subject:
        candidate && "subject" in candidate && typeof candidate.subject === "string"
          ? candidate.subject
          : "",
    };
  });
}
