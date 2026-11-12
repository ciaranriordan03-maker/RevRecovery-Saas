export const marketingEventNames = {
  accountCreationStarted: "Account Creation Started",
  bookingClick: "Booking Click",
  calculatorUsed: "Calculator Used",
  checkoutCompleted: "Checkout Completed",
  checkoutStarted: "Checkout Started",
  navigationClick: "Navigation Click",
  signInClick: "Sign In Click",
} as const;

export type CheckoutLocation =
  | "calculator"
  | "final_cta"
  | "footer"
  | "header"
  | "hero"
  | "pricing";

export type MarketingEvent =
  | { name: typeof marketingEventNames.navigationClick; props: { destination: "calculator" | "faq" | "features" | "how_it_works" | "pricing"; location: "footer" | "header" } }
  | { name: typeof marketingEventNames.checkoutStarted; props: { billing_period: "monthly"; displayed_price: "79_eur"; location: CheckoutLocation; plan: "founding_member" } }
  | { name: typeof marketingEventNames.checkoutCompleted; props: { plan: "founding_member" } }
  | { name: typeof marketingEventNames.bookingClick; props: { booking_type: "guided_setup"; location: "onboarding" | "other" | "pricing" | "purchase_success" } }
  | { name: typeof marketingEventNames.signInClick; props: { location: "footer" | "header" } }
  | { name: typeof marketingEventNames.accountCreationStarted; props: { location: "other" | "purchase_success" | "welcome_flow" } }
  | { name: typeof marketingEventNames.calculatorUsed; props: { interaction: "adjusted" } };

export function checkoutStartedEvent(location: CheckoutLocation): MarketingEvent {
  return {
    name: marketingEventNames.checkoutStarted,
    props: {
      billing_period: "monthly",
      displayed_price: "79_eur",
      location,
      plan: "founding_member",
    },
  };
}

export function isAnalyticsEnabled(input: { domain?: string; nodeEnv?: string }) {
  return input.nodeEnv === "production" && Boolean(input.domain?.trim());
}

export function sanitizeAnalyticsUrl(value: string) {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return value.split(/[?#]/, 1)[0];
  }
}

export function shouldTrackCompletedPurchase(navigationType?: string) {
  return navigationType !== "reload" && navigationType !== "back_forward";
}
