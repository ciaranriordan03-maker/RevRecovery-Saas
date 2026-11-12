"use client";

import { init } from "@plausible-analytics/tracker";
import { useEffect } from "react";
import { isAnalyticsEnabled, sanitizeAnalyticsUrl } from "../../lib/analytics/events";

let initialized = false;

export function PlausibleProvider() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

  useEffect(() => {
    if (initialized || !isAnalyticsEnabled({ domain, nodeEnv: process.env.NODE_ENV })) return;

    try {
      init({
        domain: domain!.trim(),
        logging: false,
        outboundLinks: true,
        transformRequest(payload) {
          const sanitized = { ...payload, u: sanitizeAnalyticsUrl(payload.u) };
          if (sanitized.p?.url && typeof sanitized.p.url === "string") {
            sanitized.p = { ...sanitized.p, url: sanitizeAnalyticsUrl(sanitized.p.url) };
          }
          return sanitized;
        },
      });
      initialized = true;
    } catch {
      // A blocked analytics endpoint must not affect the application.
    }
  }, [domain]);

  return null;
}
