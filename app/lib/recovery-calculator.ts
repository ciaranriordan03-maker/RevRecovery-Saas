export const RECOVERY_CALCULATOR_LIMITS = {
  monthlyRevenue: { min: 0, max: 500_000 },
  failedPaymentRate: { min: 0, max: 20 },
  recoveryRate: { min: 0, max: 100 },
} as const;

export type RecoveryCalculatorInput = {
  monthlyRevenue: number;
  failedPaymentRate: number;
  recoveryRate: number;
};

export type RecoveryCalculatorResult = {
  annualRecoveryOpportunity: number;
  monthlyRecoveryOpportunity: number;
  monthlyRevenueAtRisk: number;
};

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

export function calculateRecoveryOpportunity(input: RecoveryCalculatorInput): RecoveryCalculatorResult {
  const monthlyRevenue = clamp(input.monthlyRevenue, RECOVERY_CALCULATOR_LIMITS.monthlyRevenue.min, RECOVERY_CALCULATOR_LIMITS.monthlyRevenue.max);
  const failedPaymentRate = clamp(input.failedPaymentRate, RECOVERY_CALCULATOR_LIMITS.failedPaymentRate.min, RECOVERY_CALCULATOR_LIMITS.failedPaymentRate.max);
  const recoveryRate = clamp(input.recoveryRate, RECOVERY_CALCULATOR_LIMITS.recoveryRate.min, RECOVERY_CALCULATOR_LIMITS.recoveryRate.max);
  const monthlyRevenueAtRisk = monthlyRevenue * (failedPaymentRate / 100);
  const monthlyRecoveryOpportunity = monthlyRevenueAtRisk * (recoveryRate / 100);
  return { monthlyRevenueAtRisk, monthlyRecoveryOpportunity, annualRecoveryOpportunity: monthlyRecoveryOpportunity * 12 };
}
