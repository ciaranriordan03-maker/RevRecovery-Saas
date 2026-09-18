const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRIPE_PRICE_ID_PATTERN = /^price_[A-Za-z0-9]+$/;

export type RetentionSettingsInput = {
  downgradeActionEnabled?: unknown;
  eligibleDowngradePriceIds?: unknown;
  pauseActionEnabled?: unknown;
  supportActionEnabled?: unknown;
  supportContactEmail?: unknown;
};

export type ValidatedRetentionSettingsInput = {
  downgradeActionEnabled: boolean;
  eligibleDowngradePriceIds: string[];
  pauseActionEnabled: boolean;
  supportActionEnabled: boolean;
  supportContactEmail: string | null;
};

export class RetentionSettingsInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetentionSettingsInputError";
  }
}

function requireBoolean(value: unknown, label: string) {
  if (typeof value !== "boolean") {
    throw new RetentionSettingsInputError(`${label} must be enabled or disabled.`);
  }

  return value;
}

export function validateRetentionSettingsInput(
  input: RetentionSettingsInput,
): ValidatedRetentionSettingsInput {
  const supportActionEnabled = requireBoolean(
    input.supportActionEnabled,
    "Support actions",
  );
  const pauseActionEnabled = requireBoolean(
    input.pauseActionEnabled,
    "Pause actions",
  );
  const downgradeActionEnabled = requireBoolean(
    input.downgradeActionEnabled,
    "Downgrade actions",
  );

  if (
    input.supportContactEmail !== null &&
    input.supportContactEmail !== undefined &&
    typeof input.supportContactEmail !== "string"
  ) {
    throw new RetentionSettingsInputError("Support email must be text.");
  }

  const supportContactEmail =
    typeof input.supportContactEmail === "string"
      ? input.supportContactEmail.trim().toLowerCase()
      : "";

  if (
    supportContactEmail.length > 0 &&
    (!EMAIL_PATTERN.test(supportContactEmail) || supportContactEmail.length > 320)
  ) {
    throw new RetentionSettingsInputError("Enter a valid support email address.");
  }

  if (supportActionEnabled && supportContactEmail.length === 0) {
    throw new RetentionSettingsInputError(
      "Add a support email before enabling support actions.",
    );
  }

  if (!Array.isArray(input.eligibleDowngradePriceIds)) {
    throw new RetentionSettingsInputError(
      "Eligible downgrade prices must be a list.",
    );
  }

  const eligibleDowngradePriceIds = [
    ...new Set(
      input.eligibleDowngradePriceIds.map((value) =>
        typeof value === "string" ? value.trim() : "",
      ),
    ),
  ].filter(Boolean);

  if (
    eligibleDowngradePriceIds.length > 25 ||
    eligibleDowngradePriceIds.some(
      (priceId) => !STRIPE_PRICE_ID_PATTERN.test(priceId),
    )
  ) {
    throw new RetentionSettingsInputError(
      "Use up to 25 valid Stripe price IDs for downgrade actions.",
    );
  }

  if (downgradeActionEnabled && eligibleDowngradePriceIds.length === 0) {
    throw new RetentionSettingsInputError(
      "Add an eligible Stripe price before enabling downgrade actions.",
    );
  }

  return {
    downgradeActionEnabled,
    eligibleDowngradePriceIds,
    pauseActionEnabled,
    supportActionEnabled,
    supportContactEmail: supportContactEmail || null,
  };
}
