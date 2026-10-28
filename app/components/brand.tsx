import { Icon } from "./ui-icon";

export function BrandMark({
  variant = "default",
}: {
  variant?: "dashboard" | "default" | "mobile";
}) {
  if (variant === "mobile") {
    return (
      <div className="flex items-center gap-2">
        <Icon className="size-[18px] text-[var(--primary)]" name="refresh" />
        <span className="text-base font-normal text-[var(--foreground)]">
          RevRecovery
        </span>
      </div>
    );
  }

  const dashboard = variant === "dashboard";

  return (
    <div className={`flex items-center ${dashboard ? "gap-2.5" : "gap-3"}`}>
      <span
        className={`flex items-center justify-center bg-[var(--primary)] text-white ${
          dashboard
            ? "size-[30px] rounded-[8px]"
            : "size-10 rounded-[14px]"
        }`}
      >
        <Icon name="trend-up" className={dashboard ? "size-[18px]" : "size-6"} />
      </span>
      <span
        className={`${
          dashboard ? "text-[17px]" : "text-xl tracking-[-0.02em]"
        } font-semibold text-[var(--foreground)]`}
      >
        RevRecovery
      </span>
    </div>
  );
}
