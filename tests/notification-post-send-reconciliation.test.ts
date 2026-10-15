import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const delivery = readFileSync(
  join(process.cwd(), "app/lib/server/recovery-notification-delivery.ts"),
  "utf8",
);
const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20261015000300_notification_post_send_reconciliation.sql"),
  "utf8",
);

describe("notification post-send reconciliation", () => {
  it("records provider acceptance before finalizing delivery", () => {
    expect(delivery.indexOf("record_notification_test_provider_acceptance"))
      .toBeLessThan(delivery.indexOf("finalize_accepted_notification_test_delivery"));
    expect(migration).toContain("status = 'accepted'");
    expect(migration).toContain("provider_accepted_at = accepted_at");
  });

  it("makes accepted events non-reservable and explicitly reconcilable", () => {
    expect(migration).toContain("status in ('recorded', 'suppressed', 'queued', 'accepted', 'sent', 'failed')");
    expect(migration).toContain("event_row.status <> 'accepted'");
    expect(migration).toContain("Notification test event has no matching provider acceptance");
    expect(migration).toContain("if event_row.status = 'sent'");
  });

  it("never releases a claim after the provider has accepted the message", () => {
    const providerCallStart = delivery.indexOf("providerMessageId = await sendTestNotification");
    const afterProviderCall = delivery.slice(providerCallStart);
    expect(afterProviderCall).not.toContain('.update({ claimed_at: null, claim_token: null');
    expect(afterProviderCall).not.toContain('status: "failed"');
    expect(afterProviderCall).toContain("provider_outcome_unknown");
    expect(afterProviderCall).toContain("provider_accepted_identifier_missing");
    expect(afterProviderCall).toContain("provider_accepted_recording_pending");
    expect(afterProviderCall).toContain("provider_accepted_finalization_pending");
  });

  it("keeps reconciliation functions service-role only", () => {
    expect(migration).toContain("revoke all on function public.record_notification_test_provider_acceptance");
    expect(migration).toContain("revoke all on function public.finalize_accepted_notification_test_delivery");
    expect(migration.match(/to service_role;/g)).toHaveLength(2);
  });
});
