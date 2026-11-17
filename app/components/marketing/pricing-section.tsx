import { checkoutStartedEvent } from "../../lib/analytics/events";
import { FOUNDING_MEMBER_CHECKOUT_URL } from "../../lib/marketing-links";
import { TrackedLink } from "../analytics/tracked-link";
import { Icon } from "../ui-icon";

const includedFeatures = [
  "Automatic failed-payment tracking",
  "Timely customer reminders",
  "More chances to save subscriptions",
  "Recovered revenue at a glance",
  "Custom messages and timing",
  "Guided setup and onboarding",
] as const;

const reassuranceItems = [
  "Test before going live",
  "Stay in control",
  "Pause at any time",
] as const;

export function PricingSection() {
  return (
    <section className="marketing-pricing-halo scroll-mt-24 px-5 py-20 sm:px-8 lg:py-24" id="pricing">
      <div className="mx-auto max-w-[1040px]">
        <div className="mx-auto max-w-[720px] text-center">
          <p className="marketing-eyebrow">Simple pricing</p>
          <h2 className="marketing-title">Recover more revenue. Keep more customers.</h2>
          <p className="mx-auto mt-4 max-w-[620px] text-base leading-7 text-[var(--muted)]">
            One plan for turning failed Stripe payments into recovered subscriptions.
          </p>
        </div>

        <article className="mt-12 overflow-hidden rounded-[14px] border border-[var(--primary-border)] bg-white shadow-[var(--shadow-marketing)]">
          <div className="grid lg:grid-cols-[0.82fr_1.18fr]">
            <div className="flex flex-col border-b border-[var(--marketing-border)] p-7 sm:p-9 lg:border-b-0 lg:border-r">
              <div>
                <p className="text-sm font-semibold text-[var(--primary-text)]">Founding Member</p>
                <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
                  Put failed-payment recovery to work.
                </h3>
              </div>

              <div className="mt-8 flex items-end gap-2">
                <span className="text-6xl font-semibold leading-none tracking-[-0.06em]">€79</span>
                <span className="pb-1 text-sm font-medium text-[var(--muted)]">per month</span>
              </div>
              <p className="mt-3 text-sm font-medium text-[var(--muted)]">One plan. Everything included.</p>

              <TrackedLink
                className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-[var(--primary)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)]"
                event={checkoutStartedEvent("pricing")}
                href={FOUNDING_MEMBER_CHECKOUT_URL}
              >
                Start recovering revenue
                <Icon className="size-4" name="arrow-right" />
              </TrackedLink>
              <p className="mt-3 text-center text-xs text-[var(--muted)]">Secure checkout with Stripe.</p>
            </div>

            <div className="p-7 sm:p-9">
              <p className="text-sm font-semibold text-[var(--foreground)]">What’s included</p>
              <ul className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                {includedFeatures.map((feature) => (
                  <li className="flex gap-3 text-sm leading-6 text-[var(--muted-strong)]" key={feature}>
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--success-badge)] text-[var(--success)]">
                      <Icon className="size-3.5" name="check" />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid gap-3 border-t border-[var(--marketing-border)] bg-[var(--surface-muted)] px-7 py-5 text-xs font-medium text-[var(--muted-strong)] sm:grid-cols-3 sm:px-9">
            {reassuranceItems.map((item) => (
              <div className="flex items-center gap-2" key={item}>
                <Icon className="size-4 shrink-0 text-[var(--primary)]" name="shield-check" />
                {item}
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
