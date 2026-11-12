"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { calculateRecoveryOpportunity, RECOVERY_CALCULATOR_LIMITS } from "../../lib/recovery-calculator";

const currency = new Intl.NumberFormat("en-IE", { currency: "EUR", maximumFractionDigits: 0, style: "currency" });

type SliderProps = { label: string; max: number; min: number; onChange: (value: number) => void; prefix?: string; suffix?: string; step: number; value: number };

function Slider({ label, max, min, onChange, prefix = "", suffix = "", step, value }: SliderProps) {
  const id = label.toLowerCase().replaceAll(" ", "-");
  return <div><div className="mb-3 flex items-center justify-between gap-4"><label className="text-sm font-semibold" htmlFor={id}>{label}</label><div className="flex items-center rounded-[8px] border border-[var(--border)] bg-white px-3 py-2">{prefix && <span className="text-sm text-[var(--muted)]">{prefix}</span>}<input aria-label={`${label} value`} className="w-24 bg-transparent text-right text-sm font-semibold outline-none" id={`${id}-number`} max={max} min={min} onChange={(event) => onChange(Number(event.target.value))} step={step} type="number" value={value}/>{suffix && <span className="ml-1 text-sm text-[var(--muted)]">{suffix}</span>}</div></div><input aria-valuemax={max} aria-valuemin={min} aria-valuenow={value} className="marketing-range w-full" id={id} max={max} min={min} onChange={(event) => onChange(Number(event.target.value))} step={step} type="range" value={value}/><div className="mt-2 flex justify-between text-xs text-[var(--muted)]"><span>{prefix}{min.toLocaleString()}{suffix}</span><span>{prefix}{max.toLocaleString()}{suffix}</span></div></div>;
}

export function RecoveryCalculator() {
  const [monthlyRevenue, setMonthlyRevenue] = useState(50_000);
  const [failedPaymentRate, setFailedPaymentRate] = useState(5);
  const [recoveryRate, setRecoveryRate] = useState(35);
  const result = useMemo(() => calculateRecoveryOpportunity({ failedPaymentRate, monthlyRevenue, recoveryRate }), [failedPaymentRate, monthlyRevenue, recoveryRate]);
  return <div className="grid overflow-hidden rounded-[14px] border border-[var(--marketing-border)] bg-white shadow-[var(--shadow-marketing)] lg:grid-cols-[1.05fr_0.95fr]"><div className="space-y-8 p-6 sm:p-9"><Slider label="Monthly recurring revenue" max={RECOVERY_CALCULATOR_LIMITS.monthlyRevenue.max} min={0} onChange={setMonthlyRevenue} prefix="€" step={1000} value={monthlyRevenue}/><Slider label="Revenue affected by failed payments" max={20} min={0} onChange={setFailedPaymentRate} step={0.5} suffix="%" value={failedPaymentRate}/><Slider label="Assumed recovery rate" max={100} min={0} onChange={setRecoveryRate} step={1} suffix="%" value={recoveryRate}/><p className="rounded-[10px] bg-[var(--surface-muted)] p-4 text-xs leading-5 text-[var(--muted)]">How it works: monthly revenue × failed-payment percentage × your assumed recovery rate. Adjust every assumption to fit your business.</p></div><div className="flex flex-col bg-[var(--marketing-result)] p-6 sm:p-9"><p className="text-sm font-semibold text-[var(--primary-text)]">Your estimated opportunity</p><div className="mt-7 space-y-4"><Result label="Revenue currently at risk each month" value={result.monthlyRevenueAtRisk}/><Result highlight label="Potentially recoverable each month" value={result.monthlyRecoveryOpportunity}/><Result label="Potential annual recovery opportunity" value={result.annualRecoveryOpportunity}/></div><p className="mt-6 text-xs leading-5 text-[var(--muted)]">Estimates are illustrative, not guaranteed. Actual results depend on your customers, payment failures, timing, and account configuration.</p><Link className="mt-7 inline-flex min-h-11 items-center justify-center rounded-[8px] bg-[var(--primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]" href="/signup">Start recovering failed payments</Link></div></div>;
}

function Result({ highlight = false, label, value }: { highlight?: boolean; label: string; value: number }) {
  return <div className={`rounded-[12px] border p-4 ${highlight ? "border-[var(--success-border)] bg-[var(--success-soft)]" : "border-[var(--primary-border)] bg-white"}`}><p className="text-xs leading-5 text-[var(--muted)]">{label}</p><p aria-live="polite" className={`mt-1 text-2xl font-semibold tracking-[-0.03em] ${highlight ? "text-[var(--success)]" : "text-[var(--foreground)]"}`}>{currency.format(value)}</p></div>;
}
