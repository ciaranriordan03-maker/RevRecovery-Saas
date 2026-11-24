import { BrandMark } from "../brand";
import { Icon } from "../ui-icon";

const reassuranceItems = [
  "Start safely in Stripe test mode",
  "Customize messages and timing",
  "Pause recovery at any time",
] as const;

export function AuthMarketingPanel() {
  return (
    <section
      aria-labelledby="auth-marketing-heading"
      className="relative hidden min-h-screen overflow-hidden bg-[linear-gradient(135deg,var(--auth-gradient-start)_0%,var(--auth-gradient-mid)_56%,var(--auth-gradient-end)_100%)] px-10 py-8 text-white lg:flex lg:flex-col xl:px-14 xl:py-10"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_32%_8%,rgb(255_255_255_/_0.15),transparent_24%),radial-gradient(circle_at_78%_72%,rgb(255_255_255_/_0.08),transparent_28%)]" />

      <div className="relative z-10">
        <BrandMark variant="inverse" />
      </div>

      <div className="relative z-10 my-auto max-w-[520px] py-8">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-white/90">
          <Icon className="size-4" name="refresh" />
          Stripe-first recovery
        </p>
        <h2
          className="text-[40px] font-semibold leading-[1.08] tracking-[-0.04em] xl:text-[48px]"
          id="auth-marketing-heading"
        >
          Recover revenue without losing control.
        </h2>
        <p className="mt-5 max-w-[480px] text-base leading-7 text-white/85 xl:text-lg xl:leading-8">
          Connect Stripe safely, test your recovery flow, and choose when to go live.
        </p>

        <div className="mt-7 grid max-w-[480px] grid-cols-2 gap-3">
          <MetricCard
            icon="flow"
            label="Clear recovery sequence"
            value="3 steps"
            variant="green"
          />
          <MetricCard
            icon="shield-check"
            label="Go live when ready"
            value="Test first"
            variant="blue"
          />
        </div>

        <div className="mt-7 space-y-3">
          {reassuranceItems.map((item) => (
            <div className="flex items-center gap-3" key={item}>
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
                <Icon className="size-3.5" name="check" />
              </span>
              <p className="text-[15px] text-white/90">{item}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 flex max-w-[480px] items-center gap-3 rounded-[12px] border border-white/15 bg-white/10 px-4 py-3.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-white/15 text-white">
          <Icon className="size-5" name="shield-check" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Recovery stays on your terms</p>
          <p className="mt-0.5 text-xs leading-5 text-white/75">
            Nothing sends until you choose to go live.
          </p>
        </div>
      </div>
    </section>
  );
}

function MetricCard({
  icon,
  label,
  value,
  variant,
}: {
  icon: string;
  label: string;
  value: string;
  variant: "blue" | "green";
}) {
  const cardClass =
    variant === "green"
      ? "bg-[var(--auth-metric-green)]"
      : "bg-[var(--auth-metric-blue)]";

  return (
    <div className={`relative overflow-hidden rounded-[12px] p-4 ${cardClass}`}>
      <span className="absolute -right-8 -top-8 size-20 rounded-full bg-white/15" />
      <div className="relative mb-5 flex size-9 items-center justify-center rounded-[10px] bg-white/15">
        <Icon className="size-5 text-white" name={icon} />
      </div>
      <p className="relative text-2xl font-semibold leading-none tracking-[-0.035em] xl:text-[28px]">
        {value}
      </p>
      <p className="relative mt-2.5 text-sm text-white/85">{label}</p>
    </div>
  );
}
