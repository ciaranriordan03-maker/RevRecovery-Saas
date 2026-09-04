import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = readFileSync(new URL("../app/api/recovery/sending-domain/route.ts", import.meta.url), "utf8");
const verifyRoute = readFileSync(new URL("../app/api/recovery/sending-domain/verify/route.ts", import.meta.url), "utf8");
const statusRoute = readFileSync(new URL("../app/api/recovery/sending-domain/status/route.ts", import.meta.url), "utf8");
const disableRoute = readFileSync(new URL("../app/api/recovery/sending-domain/disable/route.ts", import.meta.url), "utf8");
const service = readFileSync(new URL("../app/lib/server/recovery-sending-domains.ts", import.meta.url), "utf8");
const panel = readFileSync(new URL("../app/components/dashboard/sending-domain-settings.tsx", import.meta.url), "utf8");
const delivery = readFileSync(new URL("../app/lib/server/recovery-delivery.ts", import.meta.url), "utf8");

describe("merchant sending-domain settings boundary", () => {
  it("authenticates every operation and scopes storage to the session user", () => {
    expect(route).toContain("getClaims()");
    expect(verifyRoute).toContain("getClaims()");
    expect(statusRoute).toContain("getClaims()");
    expect(disableRoute).toContain("getClaims()");
    expect(route).toContain('status: 401');
    expect(verifyRoute).toContain('status: 401');
    expect(statusRoute).toContain('status: 401');
    expect(disableRoute).toContain('status: 401');
    expect(service).toContain('.eq("user_id", userId)');
    expect(service).not.toContain("body.userId");
  });

  it("disables only the authenticated user's domain and makes the action explicit", () => {
    expect(disableRoute).toContain("disableSendingDomainForUser(userId)");
    expect(service).toContain('status: "disabled"');
    expect(service).toContain('disabled_at: now');
    expect(service).toContain('.eq("user_id", userId)');
    expect(panel).toContain("Stop using this domain");
    expect(panel).toContain("window.confirm");
    expect(panel).toContain("Resume verification");
  });

  it("keeps the Resend credential and provider operations server-only", () => {
    expect(service).toContain('import "server-only"');
    expect(panel).not.toContain("RESEND_API_KEY");
    expect(route).not.toContain("RESEND_API_KEY");
  });

  it("shows exact DNS values and makes verification explicit", () => {
    expect(panel).toContain("Customer-facing sending domain");
    expect(panel).toContain("updates.yourcompany.com");
    expect(panel).toContain("Verify domain");
    expect(panel).toContain("Check status");
    expect(panel).toContain("record.value");
  });

  it("uses only an eligible verified merchant domain with a platform fallback", () => {
    expect(delivery).toContain("RECOVERY_EMAIL_FROM");
    expect(delivery).toContain("getVerifiedSendingDomainForDelivery");
    expect(service).toContain("isSendingDomainEligibleForDelivery");
    expect(service).toContain("catch {");
    expect(panel).toContain("Recovery emails will use recoveries@");
    expect(panel).toContain("platform sender until this domain is verified");
    expect(panel).toContain("This branded domain is disabled");
  });
});
