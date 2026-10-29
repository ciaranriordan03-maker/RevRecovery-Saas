"use client";

import { useId, useState } from "react";
import { Icon } from "../ui-icon";

export function CaseDetailDisclosure({
  badges,
  children,
  className = "",
  collapsedLabel,
  expandedLabel,
  footer,
  title,
}: {
  badges?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  collapsedLabel: string;
  expandedLabel: string;
  footer?: React.ReactNode;
  title: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();

  return (
    <section
      className={`rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="min-w-0 flex-1 text-base font-semibold text-[var(--foreground)]">{title}</h2>
        {badges}
      </div>
      <button
        aria-controls={contentId}
        aria-expanded={expanded}
        className="mt-3 flex min-h-11 w-full items-center justify-between gap-3 text-left text-[13px] font-medium text-[var(--foreground)] focus-visible:rounded-[var(--radius-control)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] lg:hidden"
        onClick={() => setExpanded((current) => !current)}
        type="button"
      >
        <span>{expanded ? expandedLabel : collapsedLabel}</span>
        <Icon
          className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          name="chevron-down"
        />
      </button>
      <div className={`${expanded ? "block" : "hidden"} lg:block`} id={contentId}>
        {children}
      </div>
      {footer}
    </section>
  );
}
