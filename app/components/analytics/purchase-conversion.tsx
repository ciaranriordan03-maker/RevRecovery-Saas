"use client";

import { useEffect } from "react";
import { marketingEventNames, shouldTrackCompletedPurchase } from "../../lib/analytics/events";
import { trackMarketingEvent } from "../../lib/analytics/tracker";

export function PurchaseConversion() {
  useEffect(() => {
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (!shouldTrackCompletedPurchase(navigation?.type)) return;
    trackMarketingEvent({
      name: marketingEventNames.checkoutCompleted,
      props: { plan: "founding_member" },
    });
  }, []);

  return null;
}
