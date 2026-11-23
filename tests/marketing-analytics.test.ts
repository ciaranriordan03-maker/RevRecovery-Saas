import { describe, expect, it } from "vitest";
import {
  checkoutStartedEvent,
  demoBookingEvent,
  isAnalyticsEnabled,
  marketingEventNames,
  sanitizeAnalyticsUrl,
  shouldTrackCompletedPurchase,
} from "../app/lib/analytics/events";
import { DEMO_BOOKING_URL, FOUNDING_MEMBER_CHECKOUT_URL } from "../app/lib/marketing-links";

describe("marketing analytics", () => {
  it("uses stable event names", () => {
    expect(marketingEventNames).toEqual({
      accountCreationStarted: "Account Creation Started",
      bookingClick: "Booking Click",
      calculatorUsed: "Calculator Used",
      checkoutCompleted: "Checkout Completed",
      checkoutStarted: "Checkout Started",
      navigationClick: "Navigation Click",
      signInClick: "Sign In Click",
    });
  });

  it("builds checkout events with only approved properties", () => {
    expect(checkoutStartedEvent("hero")).toEqual({
      name: "Checkout Started",
      props: {
        billing_period: "monthly",
        displayed_price: "79_eur",
        location: "hero",
        plan: "founding_member",
      },
    });
  });

  it("distinguishes product demo clicks by location", () => {
    expect(demoBookingEvent("hero")).toEqual({
      name: "Booking Click",
      props: {
        booking_type: "product_demo",
        location: "hero",
      },
    });
  });

  it("enables analytics only for configured production builds", () => {
    expect(isAnalyticsEnabled({ domain: "revrecovery.io", nodeEnv: "production" })).toBe(true);
    expect(isAnalyticsEnabled({ domain: "revrecovery.io", nodeEnv: "test" })).toBe(false);
    expect(isAnalyticsEnabled({ domain: "", nodeEnv: "production" })).toBe(false);
  });

  it("removes query strings and hashes from analytics URLs", () => {
    expect(sanitizeAnalyticsUrl("https://revrecovery.io/purchase/success?session_id=secret#done")).toBe(
      "https://revrecovery.io/purchase/success",
    );
    expect(sanitizeAnalyticsUrl("https://calendly.com/setup?email=private@example.com")).toBe(
      "https://calendly.com/setup",
    );
  });

  it("does not count reloads or back-forward visits as completed purchases", () => {
    expect(shouldTrackCompletedPurchase("navigate")).toBe(true);
    expect(shouldTrackCompletedPurchase("reload")).toBe(false);
    expect(shouldTrackCompletedPurchase("back_forward")).toBe(false);
  });

  it("does not change the verified Stripe checkout destination", () => {
    expect(FOUNDING_MEMBER_CHECKOUT_URL).toBe("https://buy.stripe.com/6oU14peeOdn7dFUcNjcEw00");
  });

  it("uses the approved demo booking destination", () => {
    expect(DEMO_BOOKING_URL).toBe("https://calendly.com/ciaran-revrecovery/30min");
  });
});
