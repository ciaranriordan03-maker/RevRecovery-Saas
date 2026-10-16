import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20261015000200_notification_single_use_reservation.sql"),
  "utf8",
);
const reservation = readFileSync(
  join(process.cwd(), "app/lib/server/notification-test-delivery-reservation.ts"),
  "utf8",
);
const delivery = readFileSync(
  join(process.cwd(), "app/lib/server/recovery-notification-delivery.ts"),
  "utf8",
);

describe("single-use notification test reservation", () => {
  it("locks and consumes the exact approved authorization atomically", () => {
    expect(migration).toContain("for update");
    expect(migration).toContain("authorization_row.status <> 'approved'");
    expect(migration).toContain("authorization_row.expires_at <= now_at");
    expect(migration).toContain("status = 'consumed', consumed_at = now_at");
    expect(migration).toContain("recovery_notification_delivery_attempts_authorization_unique");
  });

  it("requires exact account, recipient, event, domain, and delivery gates", () => {
    expect(migration).toContain("Authorization and event must belong to the same account");
    expect(migration).toContain("Authorization, event, and approved recipient must match exactly");
    expect(migration).toContain("requested_global_delivery_enabled");
    expect(migration).toContain("essential_notifications_delivery_mode <> 'test'");
    expect(migration).toContain("event_row.delivery_enabled_snapshot");
    expect(migration).toContain("status = 'verified'");
  });

  it("reserves without sending or exposing the RPC to authenticated clients", () => {
    expect(migration).toContain("grant execute on function public.reserve_authorized_notification_test_delivery(uuid, uuid, uuid, boolean)");
    expect(migration).toContain("to service_role");
    expect(migration).not.toContain("provider_message_id =");
    expect(reservation).not.toContain("api.resend.com");
  });

  it("is not yet connected to the existing sender", () => {
    expect(delivery).not.toContain("reserveNotificationTestDelivery");
    expect(delivery).not.toContain("reserve_authorized_notification_test_delivery");
  });
});
