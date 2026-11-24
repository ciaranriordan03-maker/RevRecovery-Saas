import "server-only";

import { projectCancellationSequence } from "../cancellation-rescue/sequence-policy";
import { createSupabaseAdminClient } from "../supabase/admin";

type CancellationCaseProjectionSource = {
  cancel_at: string | null;
  current_period_end: string | null;
  detected_at: string;
  id: string;
};

export async function synchronizeCancellationSequenceForCase(
  cancellationCaseId: string,
) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { data: cancellationCase, error: caseError } = await supabase
    .from("cancellation_cases")
    .select("id, detected_at, cancel_at, current_period_end")
    .eq("id", cancellationCaseId)
    .single<CancellationCaseProjectionSource>();

  if (caseError || !cancellationCase) {
    throw new Error(
      `Unable to load cancellation case for orchestration: ${caseError?.message ?? "Unknown error"}`,
    );
  }

  const projectedAt = new Date().toISOString();
  const projection = projectCancellationSequence({
    detectedAt: cancellationCase.detected_at,
    projectedAt,
    scheduledEndAt:
      cancellationCase.cancel_at ?? cancellationCase.current_period_end,
  });
  const { error: projectionError } = await supabase.rpc(
    "project_cancellation_sequence",
    {
      requested_case_id: cancellationCaseId,
      requested_configuration_snapshot: projection.configurationSnapshot,
      requested_ineligible_reason:
        projection.status === "ineligible" ? projection.reason : null,
      requested_messages: projection.messages.map((message) => ({
        body_preview: message.bodyPreview,
        message_key: message.messageKey,
        scheduled_for: message.scheduledFor,
        step_number: message.stepNumber,
        subject: message.subject,
      })),
      requested_projected_at: projectedAt,
    },
  );

  if (projectionError) {
    throw new Error(
      `Unable to project cancellation sequence: ${projectionError.message}`,
    );
  }

  return projection;
}
