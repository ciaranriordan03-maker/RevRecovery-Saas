"use client";

import Link from "next/link";
import { useRef } from "react";
import { checkoutStartedEvent, demoBookingEvent, marketingEventNames } from "../../lib/analytics/events";
import { DEMO_BOOKING_URL, FOUNDING_MEMBER_CHECKOUT_URL } from "../../lib/marketing-links";
import { TrackedLink } from "../analytics/tracked-link";
import { BrandMark } from "../brand";
import { Icon } from "../ui-icon";

const navigationItems = [
  ["how-it-works", "How it works", "how_it_works"],
  ["features", "Features", "features"],
  ["calculator", "Calculator", "calculator"],
  ["pricing", "Pricing", "pricing"],
  ["faq", "FAQ", "faq"],
] as const;

function NavigationLinks({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  return navigationItems.map(([hash, label, destination]) => (
    <TrackedLink
      className={mobile ? "rounded-[8px] px-3 py-2.5 hover:bg-[var(--surface-muted)]" : "transition-colors hover:text-[var(--foreground)]"}
      event={{
        name: marketingEventNames.navigationClick,
        props: { destination, location: "header" },
      }}
      href={{ hash, pathname: "/" }}
      key={hash}
      onClick={onNavigate}
    >
      {label}
    </TrackedLink>
  ));
}

export function MarketingHeader() {
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);
  const closeMobileMenu = () => {
    if (mobileMenuRef.current) mobileMenuRef.current.open = false;
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--marketing-border)] bg-white/90 shadow-[var(--shadow-nav)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-[1180px] items-center justify-between gap-4 px-5 sm:px-8">
        <Link aria-label="RevRecovery home" href="/">
          <BrandMark variant="dashboard" />
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-7 text-sm font-medium text-[var(--muted-strong)] lg:flex">
          <NavigationLinks />
        </nav>

        <div className="flex items-center gap-2">
          <TrackedLink
            className="hidden rounded-[8px] px-3 py-2 text-sm font-semibold hover:bg-[var(--surface-muted)] sm:block"
            event={{ name: marketingEventNames.signInClick, props: { location: "header" } }}
            href="/login"
          >
            Sign in
          </TrackedLink>
          <TrackedLink
            className="hidden min-h-10 items-center rounded-[8px] border border-[var(--border-strong)] bg-white px-3.5 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)] md:inline-flex"
            event={demoBookingEvent("header")}
            href={DEMO_BOOKING_URL}
          >
            Book a demo
          </TrackedLink>
          <TrackedLink
            className="rounded-[8px] bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)]"
            event={checkoutStartedEvent("header")}
            href={FOUNDING_MEMBER_CHECKOUT_URL}
          >
            Get started
          </TrackedLink>
          <details className="group relative lg:hidden" ref={mobileMenuRef}>
            <summary className="flex size-10 list-none items-center justify-center rounded-[8px] border border-[var(--marketing-border)] bg-white text-[var(--foreground)] [&::-webkit-details-marker]:hidden">
              <span className="sr-only">Open navigation</span>
              <Icon className="size-5 group-open:hidden" name="menu" />
              <Icon className="hidden size-5 group-open:block" name="x" />
            </summary>
            <nav
              aria-label="Mobile navigation"
              className="absolute right-0 top-12 flex w-64 flex-col rounded-[12px] border border-[var(--marketing-border)] bg-white p-2 text-sm font-medium text-[var(--muted-strong)] shadow-[var(--shadow-marketing)]"
            >
              <NavigationLinks mobile onNavigate={closeMobileMenu} />
              <TrackedLink
                className="rounded-[8px] px-3 py-2.5 hover:bg-[var(--surface-muted)] md:hidden"
                event={demoBookingEvent("header")}
                href={DEMO_BOOKING_URL}
                onClick={closeMobileMenu}
              >
                Book a demo
              </TrackedLink>
              <TrackedLink
                className="rounded-[8px] px-3 py-2.5 hover:bg-[var(--surface-muted)] sm:hidden"
                event={{ name: marketingEventNames.signInClick, props: { location: "header" } }}
                href="/login"
                onClick={closeMobileMenu}
              >
                Sign in
              </TrackedLink>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
