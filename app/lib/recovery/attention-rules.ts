export type RecoveryAttentionLevel = "critical" | "warning";

export type RecoveryAttentionFlag = {
  code:
    | "communication_blocked"
    | "email_bounced"
    | "email_delivery_failed"
    | "recovery_flow_failed"
    | "sequence_exhausted";
  explanation: string;
  level: RecoveryAttentionLevel;
  title: string;
};

export type RecoveryAttentionFacts = {
  caseStatus: string;
  providerDeliveryStatuses: string[];
};

const LEVEL_RANK: Record<RecoveryAttentionLevel, number> = {
  critical: 2,
  warning: 1,
};

function hasAny(values: Set<string>, candidates: string[]) {
  return candidates.some((candidate) => values.has(candidate));
}

export function getRecoveryAttentionFlags({
  caseStatus,
  providerDeliveryStatuses,
}: RecoveryAttentionFacts): RecoveryAttentionFlag[] {
  if (
    caseStatus === "recovered" ||
    caseStatus === "canceled_by_merchant" ||
    caseStatus === "no_longer_applicable"
  ) {
    return [];
  }

  const statuses = new Set(providerDeliveryStatuses);
  const flags: RecoveryAttentionFlag[] = [];

  if (caseStatus === "failed_operationally") {
    flags.push({
      code: "recovery_flow_failed",
      explanation: "RevRecovery could not complete the automated recovery flow. Review the case timeline before contacting the customer.",
      level: "critical",
      title: "Recovery flow failed",
    });
  }

  if (hasAny(statuses, ["complained", "suppressed"])) {
    flags.push({
      code: "communication_blocked",
      explanation: "The email provider has blocked further delivery for this recipient. Use another appropriate support channel if follow-up is required.",
      level: "critical",
      title: "Email delivery blocked",
    });
  } else if (statuses.has("bounced")) {
    flags.push({
      code: "email_bounced",
      explanation: "A recovery email bounced. Check the customer address before relying on further email communication.",
      level: "warning",
      title: "Recovery email bounced",
    });
  } else if (statuses.has("failed")) {
    flags.push({
      code: "email_delivery_failed",
      explanation: "The email provider reported a delivery failure. Review the timeline and sending setup.",
      level: "warning",
      title: "Email delivery failed",
    });
  }

  if (caseStatus === "exhausted") {
    flags.push({
      code: "sequence_exhausted",
      explanation: "The automated email sequence finished without a confirmed payment. Decide whether personal follow-up is appropriate.",
      level: "warning",
      title: "Sequence exhausted",
    });
  }

  return flags.sort((left, right) => LEVEL_RANK[right.level] - LEVEL_RANK[left.level]);
}

export function getHighestRecoveryAttentionLevel(
  flags: RecoveryAttentionFlag[],
): RecoveryAttentionLevel | null {
  return flags[0]?.level ?? null;
}
