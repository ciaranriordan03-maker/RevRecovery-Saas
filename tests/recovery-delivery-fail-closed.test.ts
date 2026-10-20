import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const deliverySource = readFileSync(
  join(process.cwd(), "app/lib/server/recovery-delivery.ts"),
  "utf8",
);
const accountSettingsSource = readFileSync(
  join(process.cwd(), "app/lib/server/recovery-account-settings.ts"),
  "utf8",
);
const tokenVaultSource = readFileSync(
  join(process.cwd(), "app/lib/server/stripe-token-vault.ts"),
  "utf8",
);

describe("recovery delivery fail-closed wiring", () => {
  it("evaluates both environment gates before claiming any queued message", () => {
    const processorSource = deliverySource.slice(
      deliverySource.indexOf("export async function processPendingRecoveryMessages"),
    );

    expect(deliverySource).toContain("RECOVERY_DELIVERY_ENABLED");
    expect(deliverySource).toContain("RECOVERY_DELIVERY_KILL_SWITCH");
    expect(processorSource.indexOf("evaluateRecoveryDeliveryEnvironment({"))
      .toBeLessThan(processorSource.indexOf("claimDueRecoveryMessages(limit"));
  });

  it("uses off as the only account-settings fallback", () => {
    expect(accountSettingsSource).toContain("const failClosedFallback");
    expect(accountSettingsSource).toContain('mode: "off"');
    expect(accountSettingsSource).not.toContain('mode: "live",\n    policyVersionId: null');
  });

  it("never reuses the Supabase secret for Stripe token encryption", () => {
    expect(tokenVaultSource).toContain("STRIPE_TOKEN_ENCRYPTION_KEY");
    expect(tokenVaultSource).not.toContain("getSupabaseSecretKey");
    expect(tokenVaultSource).not.toContain("SUPABASE_SECRET_KEY");
  });
});
