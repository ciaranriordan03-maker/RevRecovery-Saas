import { Icon } from "../ui-icon";

const authHighlights = [
  "AI-powered recovery sequences",
  "Automatic Stripe integration",
  "Real-time analytics dashboard",
];

export function AuthMarketingPanel() {
  return (
    <section className="relative hidden min-h-screen overflow-hidden bg-[linear-gradient(135deg,var(--auth-gradient-start)_0%,var(--auth-gradient-mid)_56%,var(--auth-gradient-end)_100%)] px-12 py-8 text-white lg:flex lg:flex-col">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_32%_8%,rgb(255_255_255_/_0.15),transparent_24%),radial-gradient(circle_at_78%_72%,rgb(255_255_255_/_0.08),transparent_28%)]" />

      <div className="relative z-10 flex items-center gap-3">
        <span className="size-10 rounded-[12px] bg-white shadow-sm" />
        <span className="text-lg font-semibold">RevRecover</span>
      </div>

      <div className="relative z-10 my-auto max-w-[460px] py-8">
        <h1 className="text-[38px] font-semibold leading-[1.12] tracking-[-0.03em] xl:text-[42px]">
          Recover Revenue You&apos;re Already Losing
        </h1>
        <p className="mt-4 max-w-[430px] text-base leading-7 text-white/90 xl:text-lg xl:leading-8">
          Reduce failed-payment churn automatically. Connect Stripe. Recover
          revenue. Stay focused on growth.
        </p>

        <div className="mt-8 grid max-w-[450px] grid-cols-2 gap-4">
          <MetricCard
            icon="trend-up"
            label="Avg. Recovery Rate"
            value="15-20%"
            variant="green"
          />
          <MetricCard icon="clock" label="Setup Time" value="<2 min" variant="blue" />
        </div>

        <div className="mt-7 space-y-3.5">
          {authHighlights.map((item) => (
            <div className="flex items-center gap-3" key={item}>
              <span className="size-5 shrink-0 rounded-full bg-white" />
              <p className="text-base text-white/95">{item}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-8 left-12 z-10 flex items-center gap-3">
        <div className="flex -space-x-2">
          <span className="size-7 rounded-full border border-[var(--auth-avatar-border)] bg-[var(--auth-avatar-one)]" />
          <span className="size-7 rounded-full border border-[var(--auth-avatar-border)] bg-[var(--auth-avatar-two)]" />
          <span className="size-7 rounded-full border border-[var(--auth-avatar-border)] bg-[var(--auth-avatar-three)]" />
        </div>
        <p className="text-sm text-white/90">Trusted by 500+ SaaS companies</p>
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
      <div className="relative mb-6 flex size-9 items-center justify-center rounded-[10px] bg-white/16">
        <Icon name={icon} className="size-5 text-white" />
      </div>
      <p className="relative text-[31px] font-semibold leading-none tracking-[-0.04em] xl:text-[34px]">
        {value}
      </p>
      <p className="relative mt-3 text-sm text-white/85">{label}</p>
    </div>
  );
}
