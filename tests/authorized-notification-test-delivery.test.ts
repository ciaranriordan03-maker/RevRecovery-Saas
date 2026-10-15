import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateAuthorizedTestDeliveryConnection } from "../app/lib/recovery/authorized-test-delivery-policy";

const orchestration = readFileSync(
  join(process.cwd(), "app/lib/server/authorized-notification-test-delivery.ts"),
  "utf8",
);
const delivery = readFileSync(
  join(process.cwd(), "app/lib/server/recovery-notification-delivery.ts"),
  "utf8",
);
const applicationFiles = [
  readFileSync(join(process.cwd(), "app/api/recovery/notifications/test-authorization/route.ts"), "utf8"),
  readFileSync(join(process.cwd(), "app/components/dashboard/notification-test-authorization.tsx"), "utf8"),
];

describe("authorized notification test delivery connection", () => {
  it("requires both independent server gates", () => {
    expect(evaluateAuthorizedTestDeliveryConnection({ authorizedTestEnabled: false, globalEnabled: false }))
      .toEqual({ allowed: false, reason: "global_disabled" });
    expect(evaluateAuthorizedTestDeliveryConnection({ authorizedTestEnabled: false, globalEnabled: true }))
      .toEqual({ allowed: false, reason: "authorized_test_delivery_disabled" });
    expect(evaluateAuthorizedTestDeliveryConnection({ authorizedTestEnabled: true, globalEnabled: true }))
      .toEqual({ allowed: true });
  });

  it("checks both gates before consuming the authorization", () => {
    expect(orchestration.indexOf("evaluateAuthorizedTestDeliveryConnection"))
      .toBeLessThan(orchestration.indexOf("reserveNotificationTestDelivery({"));
    expect(orchestration).toContain("ESSENTIAL_NOTIFICATION_AUTHORIZED_TEST_DELIVERY_ENABLED");
    expect(orchestration).toContain("ESSENTIAL_NOTIFICATION_DELIVERY_ENABLED");
  });

  it("binds provider delivery to the exact database reservation token", () => {
    expect(orchestration).toContain("reservation.claimToken");
    expect(delivery).toContain("event.claim_token !== claimToken");
    expect(delivery).toContain('.eq("claim_token", claimToken)');
    expect(delivery).toContain('"Idempotency-Key": `essential-notification/${event.id}`');
  });

  it("releases an exact reservation if eligibility changes before delivery", () => {
    expect(delivery).toContain(
      '.update({ claim_token: null, last_error: decision.reason, status: "failed" })',
    );
    expect(delivery).toContain('.eq("claim_token", claimToken)');
  });

  it("has no route or UI caller and therefore remains dormant", () => {
    for (const source of applicationFiles) {
      expect(source).not.toContain("executeAuthorizedNotificationTestDelivery");
      expect(source).not.toContain("deliverReservedTestNotification");
    }
    expect(orchestration).not.toContain("NextResponse");
  });
});
