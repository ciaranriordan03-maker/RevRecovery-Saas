"use client";

import { track } from "@plausible-analytics/tracker";
import type { MarketingEvent } from "./events";

export function trackMarketingEvent(event: MarketingEvent) {
  try {
    track(event.name, { props: event.props });
  } catch {
    // Analytics must never interrupt navigation or product use.
  }
}
