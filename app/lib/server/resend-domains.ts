import "server-only";

const RESEND_DOMAINS_URL = "https://api.resend.com/domains";

export type ResendDnsRecord = {
  name: string;
  priority: number | null;
  record: string;
  status: string;
  ttl: string;
  type: string;
  value: string;
};

export type ResendDomain = {
  id: string;
  name: string;
  records: ResendDnsRecord[];
  status: string;
};

export class ResendDomainError extends Error {
  constructor(message = "Unable to communicate with the email domain provider.") {
    super(message);
    this.name = "ResendDomainError";
  }
}
function getApiKey() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new ResendDomainError("Email domain verification is not configured.");
  }
  return apiKey;
}

function normalizeRecord(value: unknown): ResendDnsRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.name !== "string" ||
    typeof record.type !== "string" ||
    typeof record.value !== "string"
  ) {
    return null;
  }

  return {
    name: record.name,
    priority: typeof record.priority === "number" ? record.priority : null,
    record: typeof record.record === "string" ? record.record : "",
    status: typeof record.status === "string" ? record.status : "pending",
    ttl: typeof record.ttl === "string" ? record.ttl : "Auto",
    type: record.type,
    value: record.value,
  };
}

function normalizeDomain(value: unknown): ResendDomain {
  if (!value || typeof value !== "object") throw new ResendDomainError();
  const domain = value as Record<string, unknown>;
  if (typeof domain.id !== "string" || typeof domain.name !== "string") {
    throw new ResendDomainError();
  }

  return {
    id: domain.id,
    name: domain.name,
    records: Array.isArray(domain.records)
      ? domain.records.map(normalizeRecord).filter((record): record is ResendDnsRecord => Boolean(record))
      : [],
    status: typeof domain.status === "string" ? domain.status : "pending",
  };
}

async function requestResendDomain(
  path: string,
  init: RequestInit,
  fetcher: typeof fetch = fetch,
) {
  let response: Response;
  try {
    response = await fetcher(`${RESEND_DOMAINS_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
  } catch {
    throw new ResendDomainError();
  }

  if (!response.ok) throw new ResendDomainError();
  return response.json() as Promise<unknown>;
}

export async function createResendDomain(name: string, fetcher?: typeof fetch) {
  const payload = await requestResendDomain(
    "",
    { body: JSON.stringify({ name, region: "eu-west-1" }), method: "POST" },
    fetcher,
  );
  return normalizeDomain(payload);
}

export async function getResendDomain(id: string, fetcher?: typeof fetch) {
  return normalizeDomain(await requestResendDomain(`/${encodeURIComponent(id)}`, { method: "GET" }, fetcher));
}

export async function verifyResendDomain(id: string, fetcher?: typeof fetch) {
  await requestResendDomain(`/${encodeURIComponent(id)}/verify`, { method: "POST" }, fetcher);
}
