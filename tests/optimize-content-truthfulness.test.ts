import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildOptimizeRecommendations } from "../app/lib/server/optimize-recommendations";

const root = process.cwd();

function buildForMode(
  mode: "off" | "test" | "live" | "paused",
  overrides: Partial<{
    approvedTestRecipient: string | null;
    connected: boolean;
    livemode: boolean | null;
  }> = {},
) {
  return buildOptimizeRecommendations([], [], {
    approvedTestRecipient: null,
    connected: true,
    livemode: false,
    mode,
    ...overrides,
  });
}

describe("Optimize content truthfulness", () => {
  it("shows a working setup action when Stripe is not connected", () => {
    const result = buildForMode("off", { connected: false, livemode: null });

    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0]).toMatchObject({
      actionHref: "/dashboard/settings",
      actionLabel: "Connect Stripe",
      title: "Finish connecting Stripe",
    });
  });

  it.each([
    ["off", "Turn on recovery when you are ready", "/dashboard/recovery?step=customize"],
    ["paused", "Recovery delivery is paused", "/dashboard/recovery?step=customize"],
    ["live", "Keep your live recovery flow current", "/dashboard/recovery?step=review"],
  ] as const)("shows truthful %s-mode guidance", (mode, title, actionHref) => {
    const result = buildForMode(mode);

    expect(result.recommendations[0]).toMatchObject({ actionHref, title });
  });

  it("names the approved recipient in test-mode guidance", () => {
    const result = buildForMode("test", {
      approvedTestRecipient: "test@revrecovery.io",
    });

    expect(result.recommendations[0]?.body).toContain("test@revrecovery.io");
    expect(result.recommendations[0]?.actionHref).toBe(
      "/dashboard/recovery?step=customize",
    );
  });

  it("adds an actionable active-case card only when cases are open", () => {
    const result = buildOptimizeRecommendations(
      [
        {
          amount_due: 100,
          currency: "eur",
          id: "fp_1",
          livemode: true,
          recovery_stage: "email_1",
          status: "active",
          stripe_customer_id: "cus_1",
        },
      ],
      [],
      {
        approvedTestRecipient: null,
        connected: true,
        livemode: true,
        mode: "live",
      },
    );

    expect(result.recommendations).toHaveLength(2);
    expect(result.recommendations[1]).toMatchObject({
      actionHref: "/dashboard/cases?environment=live",
      actionLabel: "View active cases",
      title: "Review active recovery cases",
    });
  });

  it("isolates recommendations and message history to the connected Stripe environment", () => {
    const result = buildOptimizeRecommendations(
      [
        {
          amount_due: 7900,
          currency: "eur",
          id: "fp_test",
          livemode: false,
          recovery_stage: "email_1",
          status: "active",
          stripe_customer_id: "cus_test",
        },
        {
          amount_due: 15000,
          currency: "eur",
          id: "fp_live",
          livemode: true,
          recovery_stage: "email_1",
          status: "active",
          stripe_customer_id: "cus_live",
        },
      ],
      [
        {
          failed_payment_id: "fp_test",
          message_key: "email_1",
          status: "sent",
          step_number: 1,
        },
        {
          failed_payment_id: "fp_live",
          message_key: "email_1",
          status: "sent",
          step_number: 1,
        },
      ],
      {
        approvedTestRecipient: "test@revrecovery.io",
        connected: true,
        livemode: false,
        mode: "test",
      },
    );

    expect(result.environmentLabel).toBe("Test Stripe data");
    expect(result.impactSummary).toEqual({
      caption: "Across 1 open failed payment · Test Stripe data",
      value: "€79.00",
    });
    expect(result.intro.summary).toContain("1 recovery message in its history");
    expect(result.recommendations[1]?.actionHref).toBe(
      "/dashboard/cases?environment=test",
    );
  });

  it("uses links and contains no unsupported or inert Optimize controls", () => {
    const cardSource = fs.readFileSync(
      path.join(root, "app/components/dashboard/recommendation-card.tsx"),
      "utf8",
    );
    const recommendationSource = fs.readFileSync(
      path.join(root, "app/lib/server/optimize-recommendations.ts"),
      "utf8",
    );
    const combined = `${cardSource}\n${recommendationSource}`;

    expect(cardSource).toContain('from "next/link"');
    expect(combined).not.toContain("Create VIP Segment");
    expect(combined).not.toContain("Apply Change");
    expect(combined).not.toContain("Dismiss");
    expect(combined).not.toContain("Add urgency to Email 3");
  });
});
