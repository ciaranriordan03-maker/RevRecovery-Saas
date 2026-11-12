"use client";

import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import type { MarketingEvent } from "../../lib/analytics/events";
import { trackMarketingEvent } from "../../lib/analytics/tracker";

type TrackedLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    children: ReactNode;
    event: MarketingEvent;
  };

export function TrackedLink({ children, event, onClick, ...props }: TrackedLinkProps) {
  return (
    <Link
      {...props}
      onClick={(clickEvent) => {
        trackMarketingEvent(event);
        onClick?.(clickEvent);
      }}
    >
      {children}
    </Link>
  );
}
