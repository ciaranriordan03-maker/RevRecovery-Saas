import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const delivery = readFileSync(
  join(process.cwd(), "app/lib/server/recovery-notification-delivery.ts"),
  "utf8",
);
const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20261013000100_notification_test_delivery_foundation.sql"),
  "utf8",
);

describe("notification test-delivery foundation", () => {
  it("requires independent global, account, test-mode, snapshot, recipient, and domain gates", () => {
    expect(delivery).toContain("ESSENTIAL_NOTIFICATION_DELIVERY_ENABLED");
    expect(delivery).toContain("essential_notifications_enabled");
    expect(delivery).toContain("essential_notifications_delivery_mode");
    expect(delivery).toContain("delivery_enabled_snapshot");
    expect(delivery).toContain("essential_notification_test_recipient");
    expect(delivery).toContain("sendingDomainStatus");
  });

  it("is not connected to a route, cron, webhook, or event recorder", () => {
    expect(delivery).toContain("export async function deliverQueuedTestNotification");
    expect(delivery).not.toContain("NextResponse");
    expect(delivery).not.toContain("tryRecordPreviewRecoveryNotificationEvent");
  });

  it("requires the single-use reservation path and keeps an append-only attempt ledger", () => {
    expect(delivery).toContain('"Idempotency-Key": `essential-notification/${event.id}`');
    expect(delivery).toContain('reason: "single_use_authorization_required"');
    expect(delivery).toContain("event.claim_token !== claimToken");
    expect(delivery).toContain("recovery_notification_delivery_attempts");
    expect(migration).toContain("recovery_notification_events_claim_token_unique");
    expect(migration).toContain("recovery_notification_events_claim_state_check");
    expect(migration).toContain("enable row level security");
  });

  it("keeps every account disabled until a separate explicit enablement", () => {
    expect(migration).toContain("essential_notifications_delivery_mode text not null default 'disabled'");
    expect(migration).toContain("essential_notification_test_recipient text");
    expect(migration).not.toMatch(/default\s+'test'/);
  });
});
