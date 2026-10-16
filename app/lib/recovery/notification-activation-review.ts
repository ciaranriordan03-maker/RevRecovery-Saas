export type NotificationActivationReviewCheck = {
  detail: string;
  id: "global_gate" | "account_gate" | "delivery_mode" | "recipient" | "domain" | "blocked_drill";
  label: string;
  status: "confirmed" | "missing";
};

export type NotificationActivationReview = {
  checks: NotificationActivationReviewCheck[];
  conclusion: "not_authorized";
  readyForAuthorizationReview: boolean;
  state: "ready" | "unavailable";
};

export type NotificationActivationReviewEvidence = {
  accountEnabled: boolean;
  accountMode: "disabled" | "test";
  approvedRecipient: string | null;
  blockedDrill: {
    eventId: string;
    eventSent: boolean;
    outcome: string;
    providerMessageId: string | null;
    reason: string;
  } | null;
  globalEnabled: boolean;
  sendingDomain: string | null;
  sendingDomainStatus: string | null;
};

export function buildNotificationActivationReview(
  evidence: NotificationActivationReviewEvidence,
): NotificationActivationReview {
  const recipientApproved = Boolean(evidence.approvedRecipient?.trim());
  const domainVerified = evidence.sendingDomainStatus === "verified";
  const drillBlockedSafely = Boolean(
    evidence.blockedDrill &&
      evidence.blockedDrill.outcome === "blocked" &&
      evidence.blockedDrill.reason === "global_disabled" &&
      !evidence.blockedDrill.eventSent &&
      !evidence.blockedDrill.providerMessageId,
  );

  const checks: NotificationActivationReviewCheck[] = [
    {
      detail: evidence.globalEnabled
        ? "The global delivery switch is enabled. It must remain off until a separately approved test."
        : "The global delivery switch is off, so no notification can reach the provider.",
      id: "global_gate",
      label: "Global delivery gate",
      status: evidence.globalEnabled ? "missing" : "confirmed",
    },
    {
      detail: evidence.accountEnabled
        ? "Account notification delivery is enabled. It must remain off until separately approved."
        : "Account notification delivery is disabled.",
      id: "account_gate",
      label: "Account delivery gate",
      status: evidence.accountEnabled ? "missing" : "confirmed",
    },
    {
      detail: evidence.accountMode === "disabled"
        ? "Delivery mode is disabled."
        : "Delivery mode is set to test and must not be used until separately approved.",
      id: "delivery_mode",
      label: "Delivery mode",
      status: evidence.accountMode === "disabled" ? "confirmed" : "missing",
    },
    {
      detail: recipientApproved
        ? `${evidence.approvedRecipient} is the separately reviewed test recipient.`
        : "No test recipient has completed separate review and approval.",
      id: "recipient",
      label: "Approved test recipient",
      status: recipientApproved ? "confirmed" : "missing",
    },
    {
      detail: domainVerified
        ? `${evidence.sendingDomain} is recorded as verified.`
        : "A verified sending domain is required before a controlled delivery test.",
      id: "domain",
      label: "Sending domain",
      status: domainVerified ? "confirmed" : "missing",
    },
    {
      detail: drillBlockedSafely
        ? `D4i event ${evidence.blockedDrill?.eventId} was blocked at the global gate with no provider message.`
        : "No complete D4i blocked-delivery record was found.",
      id: "blocked_drill",
      label: "Blocked-delivery evidence",
      status: drillBlockedSafely ? "confirmed" : "missing",
    },
  ];

  return {
    checks,
    conclusion: "not_authorized",
    readyForAuthorizationReview: checks.every((check) => check.status === "confirmed"),
    state: "ready",
  };
}

export function unavailableNotificationActivationReview(): NotificationActivationReview {
  return {
    checks: [],
    conclusion: "not_authorized",
    readyForAuthorizationReview: false,
    state: "unavailable",
  };
}
