import type { RecoveryHealthSummary } from "../../lib/recovery/recovery-health";

const toneClasses: Record<RecoveryHealthSummary["state"], string> = {
  attention: "border-[var(--danger)] bg-[var(--danger-soft)]",
  healthy: "border-[var(--success)] bg-[var(--success-soft)]",
  monitoring: "border-[var(--warning-text)] bg-[var(--warning-soft)]",
};

export function RecoveryHealthBanner({ health }: { health: RecoveryHealthSummary }) {
  return (
    <section className={`rounded-[var(--radius-card)] border-l-4 p-5 ${toneClasses[health.state]}`} aria-labelledby="recovery-health-heading">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.04em] text-[var(--muted)]">Recovery health</p>
          <h2 className="mt-2 text-base font-medium text-[var(--foreground)]" id="recovery-health-heading">{health.title}</h2>
          <p className="mt-1 text-sm leading-5 text-[var(--muted-strong)]">{health.detail}</p>
        </div>
        <span className="w-fit rounded bg-[var(--surface)] px-2 py-1 text-xs font-medium text-[var(--muted-strong)]">Read only</span>
      </div>
      <p className="mt-4 text-xs leading-5 text-[var(--muted)]">Monitoring only. RevRecovery has not sent a health notification or changed recovery delivery.</p>
    </section>
  );
}
