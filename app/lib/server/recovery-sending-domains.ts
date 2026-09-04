import "server-only";

import {
  canTransitionSendingDomainStatus,
  getSendingDomainValidationError,
  isSendingDomainEligibleForDelivery,
  normalizeSendingDomain,
  type SendingDomainStatus,
} from "../email/sending-domain";
import { createSupabaseAdminClient } from "../supabase/admin";
import { createResendDomain, getResendDomain, ResendDomainError, verifyResendDomain } from "./resend-domains";

const TABLE = "recovery_sending_domains";

type SendingDomainRow = {
  dns_records: unknown;
  domain: string;
  failure_reason: string | null;
  id: string;
  provider_domain_id: string | null;
  status: SendingDomainStatus;
  verified_at: string | null;
};

export type SendingDomainSettings = {
  dnsRecords: Array<{ name: string; priority: number | null; status: string; ttl: string; type: string; value: string }>;
  domain: string;
  failureReason: string | null;
  status: SendingDomainStatus;
  verifiedAt: string | null;
};

export class SendingDomainSettingsError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "SendingDomainSettingsError";
  }
}
function requireAdmin() {
  const client = createSupabaseAdminClient();
  if (!client) throw new SendingDomainSettingsError("Sending domain storage is not configured.", 503);
  return client;
}

function toSettings(row: SendingDomainRow): SendingDomainSettings {
  return {
    dnsRecords: Array.isArray(row.dns_records) ? row.dns_records as SendingDomainSettings["dnsRecords"] : [],
    domain: row.domain,
    failureReason: row.failure_reason,
    status: row.status,
    verifiedAt: row.verified_at,
  };
}

async function getRow(userId: string) {
  const { data, error } = await requireAdmin()
    .from(TABLE)
    .select("id, domain, provider_domain_id, status, dns_records, failure_reason, verified_at")
    .eq("user_id", userId)
    .maybeSingle<SendingDomainRow>();
  if (error) throw new SendingDomainSettingsError("Unable to load sending domain settings.", 500);
  return data;
}

function providerStatus(status: string): SendingDomainStatus {
  if (status === "verified") return "verified";
  if (["failed", "temporary_failure"].includes(status)) return "failed";
  return "pending";
}

async function updateFromProvider(userId: string, row: SendingDomainRow) {
  if (!row.provider_domain_id) throw new SendingDomainSettingsError("The sending domain is not registered.", 409);
  let provider;
  try {
    provider = await getResendDomain(row.provider_domain_id);
  } catch (error) {
    if (error instanceof ResendDomainError) throw new SendingDomainSettingsError(error.message, 502);
    throw error;
  }
  const nextStatus = providerStatus(provider.status);
  if (!canTransitionSendingDomainStatus(row.status, nextStatus)) {
    throw new SendingDomainSettingsError("The sending domain cannot move to that verification state.", 409);
  }
  const now = new Date().toISOString();
  const { data, error } = await requireAdmin()
    .from(TABLE)
    .update({
      dns_records: provider.records,
      failure_reason: nextStatus === "failed" ? "DNS verification was not completed by the provider." : null,
      status: nextStatus,
      updated_at: now,
      verified_at: nextStatus === "verified" ? now : null,
    })
    .eq("id", row.id)
    .eq("user_id", userId)
    .select("id, domain, provider_domain_id, status, dns_records, failure_reason, verified_at")
    .single<SendingDomainRow>();
  if (error || !data) throw new SendingDomainSettingsError("Unable to save sending domain status.", 500);
  return toSettings(data);
}

export async function getSendingDomainForUser(userId: string) {
  const row = await getRow(userId);
  return row ? toSettings(row) : null;
}

export async function getVerifiedSendingDomainForDelivery(userId: string) {
  try {
    const row = await getRow(userId);

    if (
      !row ||
      !isSendingDomainEligibleForDelivery({
        domain: row.domain,
        providerDomainId: row.provider_domain_id,
        status: row.status,
      })
    ) {
      return null;
    }

    return row.domain;
  } catch {
    // Domain configuration must never interrupt otherwise valid recovery mail.
    return null;
  }
}

export async function registerSendingDomainForUser(userId: string, input: unknown) {
  if (typeof input !== "string") throw new SendingDomainSettingsError("Sending domain is required.", 400);
  const domain = normalizeSendingDomain(input);
  const validationError = getSendingDomainValidationError(input);
  if (validationError) throw new SendingDomainSettingsError(validationError, 400);
  const existing = await getRow(userId);
  if (existing) {
    if (existing.domain === domain) return toSettings(existing);
    throw new SendingDomainSettingsError("A sending domain is already registered. Contact support to replace it safely.", 409);
  }
  let provider;
  try {
    provider = await createResendDomain(domain);
  } catch (error) {
    if (error instanceof ResendDomainError) throw new SendingDomainSettingsError(error.message, 502);
    throw error;
  }
  const { data, error } = await requireAdmin()
    .from(TABLE)
    .insert({
      dns_records: provider.records,
      domain,
      provider: "resend",
      provider_domain_id: provider.id,
      status: providerStatus(provider.status),
      user_id: userId,
    })
    .select("id, domain, provider_domain_id, status, dns_records, failure_reason, verified_at")
    .single<SendingDomainRow>();
  if (error || !data) throw new SendingDomainSettingsError("Unable to save the registered sending domain.", 500);
  return toSettings(data);
}

export async function verifySendingDomainForUser(userId: string) {
  const row = await getRow(userId);
  if (!row?.provider_domain_id) throw new SendingDomainSettingsError("Register a sending domain first.", 404);
  try {
    await verifyResendDomain(row.provider_domain_id);
  } catch (error) {
    if (error instanceof ResendDomainError) throw new SendingDomainSettingsError(error.message, 502);
    throw error;
  }
  const pendingRow = { ...row, status: "pending" as const };
  const { error } = await requireAdmin().from(TABLE).update({ failure_reason: null, status: "pending", updated_at: new Date().toISOString() }).eq("id", row.id).eq("user_id", userId);
  if (error) throw new SendingDomainSettingsError("Verification started, but its local status could not be saved.", 500);
  return updateFromProvider(userId, pendingRow);
}

export async function refreshSendingDomainForUser(userId: string) {
  const row = await getRow(userId);
  if (!row) throw new SendingDomainSettingsError("Register a sending domain first.", 404);
  return updateFromProvider(userId, row);
}
