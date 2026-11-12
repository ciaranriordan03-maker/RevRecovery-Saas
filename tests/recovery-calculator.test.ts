import { describe, expect, it } from "vitest";
import { calculateRecoveryOpportunity } from "../app/lib/recovery-calculator";

describe("calculateRecoveryOpportunity", () => {
  it("returns zero for zero inputs", () => expect(calculateRecoveryOpportunity({ monthlyRevenue: 0, failedPaymentRate: 0, recoveryRate: 0 })).toEqual({ annualRecoveryOpportunity: 0, monthlyRecoveryOpportunity: 0, monthlyRevenueAtRisk: 0 }));
  it("calculates a typical opportunity", () => expect(calculateRecoveryOpportunity({ monthlyRevenue: 50_000, failedPaymentRate: 5, recoveryRate: 35 })).toEqual({ annualRecoveryOpportunity: 10_500, monthlyRecoveryOpportunity: 875, monthlyRevenueAtRisk: 2_500 }));
  it("handles maximum inputs", () => expect(calculateRecoveryOpportunity({ monthlyRevenue: 500_000, failedPaymentRate: 20, recoveryRate: 100 })).toEqual({ annualRecoveryOpportunity: 1_200_000, monthlyRecoveryOpportunity: 100_000, monthlyRevenueAtRisk: 100_000 }));
  it("clamps invalid and out-of-range inputs", () => expect(calculateRecoveryOpportunity({ monthlyRevenue: Number.NaN, failedPaymentRate: 40, recoveryRate: -5 })).toEqual({ annualRecoveryOpportunity: 0, monthlyRecoveryOpportunity: 0, monthlyRevenueAtRisk: 0 }));
});
