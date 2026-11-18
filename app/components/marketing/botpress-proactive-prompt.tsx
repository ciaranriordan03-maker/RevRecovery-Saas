"use client";

import { useEffect, useState } from "react";
import {
  BOTPRESS_PROMPT_DELAY_MS,
  markBotpressPromptSeen,
  shouldShowBotpressPrompt,
} from "../../lib/botpress-prompt";

type BotpressProactivePromptProps = {
  isReady: boolean;
  onOpen: () => void;
};

export function BotpressProactivePrompt({
  isReady,
  onOpen,
}: BotpressProactivePromptProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isReady || !shouldShowBotpressPrompt(window.localStorage)) return;

    const timer = window.setTimeout(() => {
      markBotpressPromptSeen(window.localStorage);
      setIsVisible(true);
    }, BOTPRESS_PROMPT_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [isReady]);

  if (!isVisible) return null;

  return (
    <aside
      aria-label="RevRecovery AI assistant invitation"
      className="fixed bottom-24 right-4 z-[60] w-[min(22rem,calc(100vw-2rem))] rounded-[14px] border border-[var(--marketing-border)] bg-white p-5 shadow-[var(--shadow-marketing)] sm:right-6"
    >
      <button
        aria-label="Dismiss AI assistant invitation"
        className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-[8px] text-xl leading-none text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
        onClick={() => setIsVisible(false)}
        type="button"
      >
        <span aria-hidden="true">×</span>
      </button>
      <p className="pr-8 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-text)]">
        RevRecovery AI assistant
      </p>
      <p className="mt-2 text-base font-semibold leading-6 text-[var(--foreground)]">
        Have a question about failed-payment recovery?
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        See how RevRecovery works or check whether it fits your Stripe setup.
      </p>
      <button
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-[8px] bg-[var(--primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
        onClick={() => {
          setIsVisible(false);
          onOpen();
        }}
        type="button"
      >
        Ask a question
      </button>
    </aside>
  );
}
