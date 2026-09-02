import "server-only";

import { createSupabaseAdminClient } from "../supabase/admin";

export type RecoveryRecipientSuppression = {
  occurredAt: string;
  reason: "bounced" | "complained" | "suppressed";
};

export async function getRecoveryRecipientSuppression({
  email,
  userId,
}: {
  email: string;
  userId: string;
}): Promise<RecoveryRecipientSuppression | null> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Recovery recipient suppression storage is not configured.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await supabase
    .from("recovery_recipient_suppressions")
    .select("reason, occurred_at")
    .eq("user_id", userId)
    .eq("normalized_recipient_email", normalizedEmail)
    .maybeSingle<{ occurred_at: string; reason: RecoveryRecipientSuppression["reason"] }>();

  if (error) {
    throw new Error("Unable to check recovery recipient suppression.");
  }

  return data ? { occurredAt: data.occurred_at, reason: data.reason } : null;
}
