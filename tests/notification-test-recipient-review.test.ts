import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getNotificationTestRecipientInputError,
  normalizeNotificationTestRecipient,
} from "../app/lib/recovery/notification-test-recipient-policy";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20261013000200_notification_test_recipient_review.sql"),
  "utf8",
);
const route = readFileSync(
  join(process.cwd(), "app/api/recovery/notifications/test-recipient/route.ts"),
  "utf8",
);

describe("notification test-recipient review", () => {
  it("normalizes and validates recipient input", () => {
    expect(normalizeNotificationTestRecipient(" Owner+Alerts@Example.COM ")).toBe("owner+alerts@example.com");
    expect(getNotificationTestRecipientInputError({ action: "propose", recipient: "bad" })).toBe("Enter a valid test notification recipient.");
    expect(getNotificationTestRecipientInputError({ action: "clear", recipient: null })).toBeNull();
  });

  it("requires proposal and approval as separate audited actions", () => {
    expect(migration).toContain("requested_action = 'propose'");
    expect(migration).toContain("requested_action = 'approve'");
    expect(migration).toContain("is distinct from normalized_recipient");
    expect(migration).toContain("recovery_notification_recipient_reviews");
  });

  it("cannot enable delivery and keeps the RPC private to the service role", () => {
    expect(migration).toContain("delivery_enabled_snapshot boolean not null default false");
    expect(migration).toContain("check (delivery_enabled_snapshot = false)");
    expect(migration).not.toMatch(/essential_notifications_enabled\s*=\s*true/);
    expect(migration).toContain("grant execute on function public.review_notification_test_recipient(uuid, text, text) to service_role");
  });

  it("uses an authenticated route boundary", () => {
    expect(route).toContain("getClaims()");
    expect(route).toContain('status: 401');
  });
});
