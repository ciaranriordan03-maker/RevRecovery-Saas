import "server-only";

import type Stripe from "stripe";
import { createStripePlatformClient } from "../stripe/server";
import { sanitizeWebhookError } from "../stripe/webhook-processing";
import { createSupabaseAdminClient } from "../supabase/admin";
import { reconcileScheduledCancellationSubscriptions } from "./cancellation-cases";
import { processCancellationProjectionOutbox } from "./cancellation-projections";
import { listConnectedStripeAccountsForReconciliation } from "./stripe-connections";
import { retryCancellationWebhookEvents } from "./cancellation-webhook-retries";

type ReconciliationRun = {
  cursor: string | null;
  id: string;
  livemode: boolean;
  pages_processed: number;
  processing_attempt_count: number;
  next_attempt_at: string | null;
  stripe_account_id: string;
  subscriptions_observed: number;
  user_id: string;
};

const MAX_ATTEMPTS = 8;

function retryAt(attempt: number) {
  const seconds = Math.min(30 * 2 ** Math.max(attempt - 1, 0), 900);
  return new Date(Date.now() + seconds * 1000).toISOString();
}

async function getOrCreateRun(connection: {
  livemode: boolean;
  stripe_account_id: string;
  user_id: string;
}) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("Supabase admin client is not configured.");

  const { data: existing, error: loadError } = await supabase
    .from("cancellation_reconciliation_runs")
    .select("*")
    .eq("user_id", connection.user_id)
    .eq("stripe_account_id", connection.stripe_account_id)
    .eq("livemode", connection.livemode)
    .in("status", ["pending", "processing", "failed"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<ReconciliationRun>();
  if (loadError) throw new Error(`Unable to load reconciliation run: ${loadError.message}`);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("cancellation_reconciliation_runs")
    .insert({
      livemode: connection.livemode,
      status: "pending",
      stripe_account_id: connection.stripe_account_id,
      user_id: connection.user_id,
    })
    .select("*")
    .single<ReconciliationRun>();
  if (error) {
    // Another cron may have won the partial-unique race; the next run resumes it.
    if (error.code === "23505") return null;
    throw new Error(`Unable to create reconciliation run: ${error.message}`);
  }
  return data;
}

async function processRun(run: ReconciliationRun, maxPages: number) {
  const supabase = createSupabaseAdminClient();
  const stripe = createStripePlatformClient();
  if (!supabase || !stripe) throw new Error("Reconciliation services are not configured.");
  if (run.next_attempt_at && Date.parse(run.next_attempt_at) > Date.now()) {
    return { pages: 0, subscriptions: 0, status: "backoff" as const };
  }

  const claimToken = crypto.randomUUID();
  const attempt = run.processing_attempt_count + 1;
  const { data: claimed, error: claimError } = await supabase
    .from("cancellation_reconciliation_runs")
    .update({
      claim_expires_at: new Date(Date.now() + 120_000).toISOString(),
      claim_token: claimToken,
      processing_attempt_count: attempt,
      started_at: new Date().toISOString(),
      status: "processing",
    })
    .eq("id", run.id)
    .or(`status.in.(pending,failed),and(status.eq.processing,claim_expires_at.lt.${new Date().toISOString()})`)
    .select("*")
    .maybeSingle<ReconciliationRun>();
  if (claimError) throw new Error(`Unable to claim reconciliation run: ${claimError.message}`);
  if (!claimed) return { pages: 0, subscriptions: 0, status: "already_claimed" as const };

  let cursor = claimed.cursor ?? undefined;
  let pages = 0;
  let observed = 0;
  try {
    while (pages < maxPages) {
      const page: Stripe.ApiList<Stripe.Subscription> = await stripe.subscriptions.list(
        { limit: 100, starting_after: cursor, status: "all" },
        { stripeAccount: claimed.stripe_account_id },
      );
      await reconcileScheduledCancellationSubscriptions({
        livemode: claimed.livemode,
        source: "reconciliation",
        stripeAccountId: claimed.stripe_account_id,
        subscriptions: page.data,
        userId: claimed.user_id,
      });
      pages += 1;
      observed += page.data.length;
      cursor = page.data.at(-1)?.id;
      const completed = !page.has_more;
      const { error: checkpointError } = await supabase
        .from("cancellation_reconciliation_runs")
        .update({
          claim_expires_at: completed ? null : new Date(Date.now() + 120_000).toISOString(),
          claim_token: completed ? null : claimToken,
          completed_at: completed ? new Date().toISOString() : null,
          cursor: completed ? null : cursor,
          pages_processed: claimed.pages_processed + pages,
          status: completed ? "completed" : "processing",
          subscriptions_observed: claimed.subscriptions_observed + observed,
          updated_at: new Date().toISOString(),
        })
        .eq("id", claimed.id)
        .eq("claim_token", claimToken);
      if (checkpointError) throw checkpointError;
      if (completed) {
        await supabase
          .from("cancellation_rescue_settings")
          .update({ last_reconciled_at: new Date().toISOString() })
          .eq("user_id", claimed.user_id)
          .eq("stripe_account_id", claimed.stripe_account_id)
          .eq("livemode", claimed.livemode);
        return { pages, subscriptions: observed, status: "completed" as const };
      }
      if (!cursor) throw new Error("Stripe reconciliation pagination did not advance.");
    }
    return { pages, subscriptions: observed, status: "checkpointed" as const };
  } catch (error) {
    const sanitized = sanitizeWebhookError(error);
    await supabase
      .from("cancellation_reconciliation_runs")
      .update({
        claim_expires_at: null,
        claim_token: null,
        last_error_code: sanitized.code,
        next_attempt_at: attempt >= MAX_ATTEMPTS ? null : retryAt(attempt),
        status: attempt >= MAX_ATTEMPTS ? "dead_letter" : "failed",
      })
      .eq("id", claimed.id)
      .eq("claim_token", claimToken);
    throw error;
  }
}

export async function processCancellationReconciliation(options: {
  accountLimit?: number;
  pagesPerAccount?: number;
} = {}) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("Supabase admin client is not configured.");
  const { data: platformControl, error: controlError } = await supabase
    .from("cancellation_platform_controls")
    .select("enabled")
    .eq("control_key", "shadow_processing")
    .single<{ enabled: boolean }>();
  if (controlError) {
    throw new Error(`Unable to load cancellation platform control: ${controlError.message}`);
  }
  if (!platformControl.enabled) {
    console.info("cancellation_rescue.reconciliation_batch", {
      disabled: true,
      reason: "platform_kill_switch",
    });
    return {
      accounts: 0,
      disabled: true,
      expired: 0,
      projections: { claimed: 0, completed: 0, failed: 0 },
      results: [],
      webhookRetries: { candidates: 0, completed: 0, failed: 0 },
    };
  }
  const connections = await listConnectedStripeAccountsForReconciliation(options.accountLimit ?? 10);
  const results = [];

  for (const connection of connections) {
    if (connection.livemode === null) continue;
    const run = await getOrCreateRun({
      livemode: connection.livemode,
      stripe_account_id: connection.stripe_account_id,
      user_id: connection.user_id,
    });
    if (run) results.push(await processRun(run, options.pagesPerAccount ?? 5));
  }

  const { data: expired } = await supabase.rpc("expire_due_cancellation_cases", {
    requested_limit: 250,
  });
  const projections = await processCancellationProjectionOutbox(50);
  const webhookRetries = await retryCancellationWebhookEvents(25);
  console.info("cancellation_rescue.reconciliation_batch", {
    accounts: connections.length,
    expired: Number(expired ?? 0),
    projections,
    webhookRetries,
    runs: results.length,
  });
  return { accounts: connections.length, expired: Number(expired ?? 0), projections, results, webhookRetries };
}
