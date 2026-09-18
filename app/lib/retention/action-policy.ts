import type { CancellationReasonCode } from "./cancellation-reasons";

export const retentionActionTypes = [
  "support",
  "pause",
  "downgrade",
  "continue_canceling",
] as const;

export type RetentionActionType = (typeof retentionActionTypes)[number];

export type RetentionActionAvailability = {
  downgradePlanIds: readonly string[];
  pauseSupported: boolean;
  supportAvailable: boolean;
};

export type RetentionActionRecommendation = {
  action: RetentionActionType;
  explanation: string;
  priority: number;
};

const actionPreferenceByReason: Record<
  CancellationReasonCode,
  readonly RetentionActionType[]
> = {
  billing_issues: ["support"],
  business_closed: [],
  missing_features: ["support"],
  not_using_enough: ["pause", "downgrade"],
  other: ["support"],
  prefer_not_to_say: [],
  support_issues: ["support"],
  switched_provider: ["support"],
  technical_issues: ["support"],
  temporary_pause: ["pause"],
  too_expensive: ["downgrade", "pause"],
};

const actionExplanations: Record<RetentionActionType, string> = {
  continue_canceling: "The customer can always continue without accepting an offer.",
  downgrade: "An eligible lower-priced plan may better fit the customer's needs.",
  pause: "A temporary pause may avoid an unnecessary permanent cancellation.",
  support: "A product, billing, or support conversation may resolve the stated issue.",
};

function isActionAvailable(
  action: RetentionActionType,
  availability: RetentionActionAvailability,
) {
  if (action === "pause") {
    return availability.pauseSupported;
  }

  if (action === "downgrade") {
    return availability.downgradePlanIds.length > 0;
  }

  if (action === "support") {
    return availability.supportAvailable;
  }

  return true;
}

export function recommendRetentionActions({
  availability,
  reason,
}: {
  availability: RetentionActionAvailability;
  reason: CancellationReasonCode;
}): RetentionActionRecommendation[] {
  const recommended = actionPreferenceByReason[reason]
    .filter((action) => isActionAvailable(action, availability))
    .map((action, index) => ({
      action,
      explanation: actionExplanations[action],
      priority: index + 1,
    }));

  return [
    ...recommended,
    {
      action: "continue_canceling",
      explanation: actionExplanations.continue_canceling,
      priority: recommended.length + 1,
    },
  ];
}
