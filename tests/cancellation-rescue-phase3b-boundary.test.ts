import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const service = source("app/lib/server/cancellation-rescue-test-actions.ts");
const previewRoute = source("app/api/cancellation-rescue/test/preview/route.ts");
const confirmRoute = source("app/api/cancellation-rescue/test/confirm/route.ts");
const routes = `${previewRoute}\n${confirmRoute}`;
const reconciliation = source("app/lib/server/cancellation-reconciliation.ts");

describe("cancellation rescue phase 3B runtime boundary", () => {
  it("exposes POST-only, same-origin, bounded JSON routes with neutral responses", () => {
    expect(previewRoute).toContain("export async function POST");
    expect(confirmRoute).toContain("export async function POST");
    expect(routes).not.toContain("export async function GET");
    expect(routes).toContain("isCancellationTestRescueSameOrigin");
    expect(routes).toContain("hasCancellationTestRescueJsonContentType");
    expect(routes).toContain("hasCancellationTestRescueBodyWithinLimit");
    expect(routes).toContain('"Cache-Control": "private, no-store"');
    expect(routes).not.toContain("rawToken");
  });

  it("requires a test secret, state re-fetch, idempotency, and explicit reversal", () => {
    expect(service).toContain('startsWith("sk_test_")');
    expect(service).toContain("stripe.subscriptions.retrieve");
    expect(service).toContain("evaluateCancellationTestRescueSubscription");
    expect(service).toContain("stripe.subscriptions.update");
    expect(service).toContain("cancel_at_period_end: false");
    expect(service).toContain("idempotencyKey: reservation.idempotency_key");
  });

  it("has no public issuer route, email delivery, or direct case-success write", () => {
    expect(routes).not.toContain("issueCancellationTestRescueToken");
    expect(service).not.toContain("resend");
    expect(service).not.toContain("RECOVERY_DELIVERY_ENABLED");
    expect(service).not.toContain('.from("cancellation_cases").update');
  });

  it("lets webhook or reconciliation evidence confirm uncertain outcomes", () => {
    expect(reconciliation).toContain("maintainCancellationTestRescueActions");
    expect(service).toContain("reconcile_stale_cancellation_test_rescue_reservations");
    expect(service).toContain("finalize_confirmed_cancellation_test_rescues");
  });
});
