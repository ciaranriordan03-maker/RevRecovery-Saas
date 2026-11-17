import Link from "next/link";
import { checkoutStartedEvent } from "../../lib/analytics/events";
import { FOUNDING_MEMBER_CHECKOUT_URL } from "../../lib/marketing-links";
import { TrackedLink } from "../analytics/tracked-link";
import { Icon } from "../ui-icon";

const includedFeatures = [
  "Stripe failed-payment activity in one focused workspace",
  "Carefully timed customer recovery reminders",
  "Editable message content and recovery timing",
  "Safe testing before live activation",
  "Visibility across open and recovered cases",
  "Automatic case updates after successful payment",
  "Pause recovery whenever needed",
  "Performance insights and practical recommendations",
  "Guided onboarding and setup support",
] as const;

const reassuranceItems = [
  "Start safely in Stripe test mode",
  "You choose when recovery goes live",
  "Pause whenever you need to",
] as const;

export function PricingSection() {
  return (
    <section className="marketing-pricing-halo scroll-mt-24 px-5 py-20 sm:px-8 lg:py-24" id="pricing">
      <div className="mx-auto max-w-[1040px]">
        <div className="mx-auto max-w-[720px] text-center">
          <p className="marketing-eyebrow">Simple pricing</p>
          <h2 className="marketing-title">Start recovering revenue with one straightforward plan.</h2>
          <p className="mx-auto mt-4 max-w-[620px] text-base leading-7 text-[var(--muted)]">
            Get the recovery workspace and guided setup you need to launch safely.
          </p>
        </div>

        <article className="mt-12 overflow-hidden rounded-[14px] border border-[var(--primary-border)] bg-white shadow-[var(--shadow-marketing)]">
          <div className="grid lg:grid-cols-[0.82fr_1.18fr]">
            <div className="flex flex-col border-b border-[var(--marketing-border)] p-7 sm:p-9 lg:border-b-0 lg:border-r">
              <div>
                <p className="text-sm font-semibold text-[var(--primary-text)]">Founding Member</p>
                <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
                  Failed-payment recovery for growing Stripe subscription businesses.
                </h3>
              </div>

              <div className="mt-8 flex items-end gap-2">
                <span className="text-6xl font-semibold leading-none tracking-[-0.06em]">€79</span>
                <span className="pb-1 text-sm font-medium text-[var(--muted)]">per month</span>
              </div>
              <p className="mt-3 text-sm font-medium text-[var(--muted)]">One straightforward monthly plan.</p>

              <TrackedLink
                className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-[var(--primary)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)]"
                event={checkoutStartedEvent("pricing")}
                href={FOUNDING_MEMBER_CHECKOUT_URL}
              >
                Get started with RevRecovery
                <Icon className="size-4" name="arrow-right" />
              </TrackedLink>
              <p className="mt-3 text-center text-xs text-[var(--muted)]">Secure checkout with Stripe.</p>

              <Link
                className="mt-5 text-center text-sm font-semibold text-[var(--primary-text)] underline-offset-4 hover:underline"
                href={{ hash: "how-it-works", pathname: "/" }}
              >
                See how it works
              </Link>
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
