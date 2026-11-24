import "server-only";

import type Stripe from "stripe";
import { getWebhookRetryDelaySeconds, sanitizeWebhookError } from "../stripe/webhook-processing";
import { recordCancellationSubscriptionEvent } from "./cancellation-cases";
import {
  claimWebhookEvent,
  completeWebhookEvent,
  listRetriableCancellationWebhookEvents,
} from "./stripe-webhooks";
import { createSupabaseAdminClient } from "../supabase/admin";

export async function retryCancellationWebhookEvents(limit = 25) {
  const candidates = await listRetriableCancellationWebhookEvents(limit);
  let completed = 0;
  let failed = 0;

  for (const candidate of candidates) {
    const claimToken = crypto.randomUUID();
    const claimed = await claimWebhookEvent(candidate.stripe_event_id, claimToken);
    if (!claimed) continue;
    try {
      const event = candidate.payload;
      if (!candidate.user_id || event.account !== candidate.stripe_account_id) {
        await completeWebhookEvent({
          claimToken,
          ignoredReason: "invalid_retry_ownership",
          outcome: "ignored",
          stripeEventId: candidate.stripe_event_id,
        });
      } else {
        await recordCancellationSubscriptionEvent({
          eventCreated: event.created,
          eventType: event.type as "customer.subscription.updated" | "customer.subscription.deleted",
          livemode: candidate.livemode,
          source: "stripe_webhook",
          sourceEventId: event.id,
          stripeAccountId: candidate.stripe_account_id,
          subscription: event.data.object as Stripe.Subscription,
          userId: candidate.user_id,
        });
        await completeWebhookEvent({
          claimToken,
          outcome: "processed",
          stripeEventId: candidate.stripe_event_id,
        });
      }
      completed += 1;
    } catch (error) {
      const sanitized = sanitizeWebhookError(error);
      const delay = getWebhookRetryDelaySeconds(claimed.processing_attempt_count);
      await completeWebhookEvent({
        claimToken,
        errorCode: sanitized.code,
        errorDetails: sanitized.details,
        nextAttemptAt: new Date(Date.now() + delay * 1000).toISOString(),
        outcome: "failed",
        stripeEventId: candidate.stripe_event_id,
      });
      failed += 1;
    }
  }

  const supabase = createSupabaseAdminClient();
  if (supabase) await supabase.rpc("dead_letter_exhausted_stripe_webhooks", { requested_max_attempts: 8 });
  console.info("cancellation_rescue.webhook_retry_batch", {
    candidates: candidates.length,
    completed,
    failed,
  });
  return { candidates: candidates.length, completed, failed };
}
