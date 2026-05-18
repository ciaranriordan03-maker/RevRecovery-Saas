import { Icon } from "./ui-icon";

export function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 items-center justify-center rounded-[14px] bg-[var(--primary)] text-white">
        <Icon name="trend-up" className="size-6" />
      </span>
      <span className="text-xl font-semibold tracking-[-0.02em] text-[var(--foreground)]">
        RevRecovery
      </span>
    </div>
  );
}
