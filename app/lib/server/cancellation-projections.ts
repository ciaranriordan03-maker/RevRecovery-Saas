import "server-only";

import { sanitizeWebhookError } from "../stripe/webhook-processing";
import { createSupabaseAdminClient } from "../supabase/admin";
import { synchronizeCancellationSequenceForCase } from "./cancellation-sequences";

type ProjectionJob = {
  cancellation_case_id: string;
  id: string;
  processing_attempt_count: number;
};

const MAX_ATTEMPTS = 8;

function retryAt(attempt: number) {
  const seconds = Math.min(30 * 2 ** Math.max(attempt - 1, 0), 900);
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export async function processCancellationProjectionOutbox(limit = 25) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("Supabase admin client is not configured.");

  const claimToken = crypto.randomUUID();
  const { data, error } = await supabase.rpc("claim_cancellation_projection_jobs", {
    requested_claim_token: claimToken,
    requested_lease_seconds: 120,
    requested_limit: Math.min(Math.max(limit, 1), 100),
    requested_max_attempts: MAX_ATTEMPTS,
  });
  if (error) throw new Error(`Unable to claim cancellation projection jobs: ${error.message}`);

  const jobs = (data ?? []) as ProjectionJob[];
  let completed = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      await synchronizeCancellationSequenceForCase(job.cancellation_case_id);
      const { error: completionError } = await supabase.rpc(
        "complete_cancellation_projection_job",
        {
          requested_claim_token: claimToken,
          requested_error_code: null,
          requested_job_id: job.id,
          requested_max_attempts: MAX_ATTEMPTS,
          requested_next_attempt_at: null,
          requested_outcome: "completed",
        },
      );
      if (completionError) throw completionError;
      completed += 1;
    } catch (error) {
      const sanitized = sanitizeWebhookError(error);
      await supabase.rpc("complete_cancellation_projection_job", {
        requested_claim_token: claimToken,
        requested_error_code: sanitized.code,
        requested_job_id: job.id,
        requested_max_attempts: MAX_ATTEMPTS,
        requested_next_attempt_at: retryAt(job.processing_attempt_count),
        requested_outcome: "failed",
      });
      failed += 1;
    }
  }

  console.info("cancellation_rescue.projection_batch", {
    claimed: jobs.length,
    completed,
    failed,
  });
  return { claimed: jobs.length, completed, failed };
}
