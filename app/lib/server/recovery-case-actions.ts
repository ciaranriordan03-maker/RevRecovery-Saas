import "server-only";

import { createSupabaseAdminClient } from "../supabase/admin";

export type RecoveryCasePauseResult = {
  changedMessages: number;
  manuallyPausedAt: string | null;
  paused: boolean;
};

type RecoveryCasePauseRpcResult = {
  changed_messages?: unknown;
  manual_outreach_paused_at?: unknown;
  paused?: unknown;
};

export async function setRecoveryCaseManualPause({
  failedPaymentId,
  paused,
  userId,
}: {
  failedPaymentId: string;
  paused: boolean;
  userId: string;
}): Promise<RecoveryCasePauseResult> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Recovery case actions are not configured.");
  }

  const { data, error } = await supabase.rpc("set_recovery_case_manual_pause", {
    requested_failed_payment_id: failedPaymentId,
    requested_paused: paused,
    requested_user_id: userId,
  });

  if (error) {
    if (error.message.includes("Recovery case not found")) {
      throw new Error("Recovery case not found.");
    }
    if (error.message.includes("Resolved recovery cases")) {
      throw new Error("Resolved recovery cases cannot change email delivery.");
    }
    throw new Error(`Unable to ${paused ? "pause" : "resume"} recovery emails.`);
  }

  const result = data as RecoveryCasePauseRpcResult | null;
  if (
    !result ||
    typeof result.changed_messages !== "number" ||
    typeof result.paused !== "boolean" ||
    (
      result.manual_outreach_paused_at !== null &&
      typeof result.manual_outreach_paused_at !== "string"
    )
  ) {
    throw new Error("Recovery case action returned an invalid result.");
  }

  return {
    changedMessages: result.changed_messages,
    manuallyPausedAt: result.manual_outreach_paused_at,
    paused: result.paused,
  };
}
