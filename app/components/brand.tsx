import { Icon } from "./ui-icon";

export function BrandMark() {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-[10px] bg-[var(--primary)] text-white">
        <Icon name="bolt" />
      </span>
      <span className="text-base font-semibold text-[var(--foreground)]">
        RecoverFlow
      </span>
    </div>
  );
}
