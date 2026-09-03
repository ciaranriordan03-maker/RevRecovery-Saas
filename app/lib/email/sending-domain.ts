export const sendingDomainStatuses = [
  "pending",
  "verified",
  "failed",
  "disabled",
] as const;

export type SendingDomainStatus = (typeof sendingDomainStatuses)[number];

export type SendingDomainEligibility = {
  domain: string;
  providerDomainId: string | null | undefined;
  status: SendingDomainStatus;
};

const DOMAIN_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const IPV4_PATTERN = /^\d{1,3}(?:\.\d{1,3}){3}$/;

const allowedStatusTransitions: Record<
  SendingDomainStatus,
  ReadonlySet<SendingDomainStatus>
> = {
  pending: new Set(["pending", "verified", "failed", "disabled"]),
  verified: new Set(["verified", "pending", "failed", "disabled"]),
  failed: new Set(["failed", "pending", "disabled"]),
  disabled: new Set(["disabled", "pending"]),
};

export function normalizeSendingDomain(value: string) {
  return value.trim().toLowerCase().replace(/\.+$/, "");
}

export function getSendingDomainValidationError(value: string) {
  const domain = normalizeSendingDomain(value);

  if (!domain) {
    return "Sending domain is required.";
  }

  if (
    value.includes("://") ||
    domain.includes("/") ||
    domain.includes("@") ||
    domain.includes(":") ||
    domain.includes("*")
  ) {
    return "Enter only a domain name, without a URL, email address, port, or wildcard.";
  }

  if (domain === "localhost" || IPV4_PATTERN.test(domain)) {
    return "Use a public domain that can be verified through DNS.";
  }

  if (domain.length > 253) {
    return "Sending domain must be 253 characters or fewer.";
  }

  const labels = domain.split(".");
  if (labels.length < 2 || labels.some((label) => !DOMAIN_LABEL_PATTERN.test(label))) {
    return "Enter a valid ASCII or punycode domain, such as mail.example.com.";
  }

  return null;
}

export function canTransitionSendingDomainStatus(
  current: SendingDomainStatus,
  next: SendingDomainStatus,
) {
  return allowedStatusTransitions[current].has(next);
}

export function isSendingDomainEligibleForDelivery({
  domain,
  providerDomainId,
  status,
}: SendingDomainEligibility) {
  return (
    status === "verified" &&
    Boolean(providerDomainId?.trim()) &&
    getSendingDomainValidationError(domain) === null
  );
}
