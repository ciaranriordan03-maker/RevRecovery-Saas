import { describe, expect, it } from "vitest";
import {
  getHighestRecoveryAttentionLevel,
  getRecoveryAttentionFlags,
} from "../app/lib/recovery/attention-rules";

describe("deterministic recovery attention rules", () => {
  it("does not flag a healthy active case", () => {
    expect(getRecoveryAttentionFlags({
      caseStatus: "active",
      providerDeliveryStatuses: ["delivered"],
    })).toEqual([]);
  });

  it("does not ask for attention after a case is resolved", () => {
    expect(getRecoveryAttentionFlags({
      caseStatus: "recovered",
      providerDeliveryStatuses: ["bounced", "suppressed"],
    })).toEqual([]);
  });

  it("flags an operationally failed flow as critical", () => {
    expect(getRecoveryAttentionFlags({
      caseStatus: "failed_operationally",
      providerDeliveryStatuses: [],
    })[0]).toMatchObject({
      code: "recovery_flow_failed",
      level: "critical",
    });
  });

  it("treats suppression and complaints as blocked communication", () => {
    for (const status of ["suppressed", "complained"]) {
      expect(getRecoveryAttentionFlags({
        caseStatus: "active",
        providerDeliveryStatuses: [status],
      })[0]).toMatchObject({
        code: "communication_blocked",
        level: "critical",
      });
    }
  });

  it("flags bounced and failed delivery without overstating the cause", () => {
    expect(getRecoveryAttentionFlags({
      caseStatus: "active",
      providerDeliveryStatuses: ["bounced"],
    })[0].code).toBe("email_bounced");
    expect(getRecoveryAttentionFlags({
      caseStatus: "active",
      providerDeliveryStatuses: ["failed"],
    })[0].code).toBe("email_delivery_failed");
  });

  it("flags an exhausted sequence and preserves severity order", () => {
    const flags = getRecoveryAttentionFlags({
      caseStatus: "exhausted",
      providerDeliveryStatuses: ["suppressed"],
    });
    expect(flags.map((flag) => flag.code)).toEqual([
      "communication_blocked",
      "sequence_exhausted",
    ]);
    expect(getHighestRecoveryAttentionLevel(flags)).toBe("critical");
  });
});
