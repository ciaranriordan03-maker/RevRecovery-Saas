import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getNotificationTestAuthorizationInputError,
  isNotificationTestAuthorizationAction,
} from "../app/lib/recovery/notification-test-authorization-policy";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20261015000100_notification_one_time_authorization.sql"),
  "utf8",
);
const delivery = readFileSync(
  join(process.cwd(), "app/lib/server/recovery-notification-delivery.ts"),
  "utf8",
);
const route = readFileSync(
  join(process.cwd(), "app/api/recovery/notifications/test-authorization/route.ts"),
  "utf8",
);

describe("one-time notification test authorization", () => {
  it("accepts only explicit request, approve, and revoke actions", () => {
    expect(isNotificationTestAuthorizationAction("request")).toBe(true);
    expect(isNotificationTestAuthorizationAction("approve")).toBe(true);
    expect(isNotificationTestAuthorizationAction("revoke")).toBe(true);
    expect(isNotificationTestAuthorizationAction("send")).toBe(false);
    expect(getNotificationTestAuthorizationInputError({ action: "request", authorizationId: null })).toBeNull();
    expect(getNotificationTestAuthorizationInputError({ action: "approve", authorizationId: "bad" })).toBe("Choose an active notification test authorization.");
  });

  it("requires exact-recipient review, disabled gates, D4i evidence, and a verified domain", () => {
    expect(migration).toContain("essential_notifications_enabled or");
    expect(migration).toContain("if requested_global_delivery_enabled then");
    expect(migration).toContain("essential_notifications_delivery_mode <> 'disabled'");
    expect(migration).toContain("essential_notification_test_recipient_approved_at is null");
    expect(migration).toContain("status = 'verified'");
    expect(migration).toContain("events.payload @> '{\"drill\":\"D4i\"}'::jsonb");
    expect(migration).toContain("is distinct from account_settings.essential_notification_test_recipient");
  });

  it("is single-use, short-lived, audited, and private to the service role", () => {
    expect(migration).toContain("where status in ('pending', 'approved')");
    expect(migration).toContain("now_at + interval '15 minutes'");
    expect(migration).toContain("recovery_notification_test_authorization_audit");
    expect(migration).toContain("status in ('pending', 'approved', 'consumed', 'revoked', 'expired')");
    expect(migration).toContain("grant execute on function public.review_notification_test_authorization(uuid, text, uuid, boolean) to service_role");
  });

  it("does not connect authorization to the sender or enable delivery", () => {
    expect(delivery).not.toContain("recovery_notification_test_authorizations");
    expect(migration).not.toMatch(/essential_notifications_enabled\s*=\s*true/);
    expect(migration).not.toMatch(/essential_notifications_delivery_mode\s*=\s*'test'/);
  });

  it("uses an authenticated, uncached route boundary", () => {
    expect(route).toContain("getClaims()");
    expect(route).toContain('status: 401');
    expect(route).toContain("export async function POST");
  });
});
