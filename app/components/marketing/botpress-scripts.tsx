"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { BotpressProactivePrompt } from "./botpress-proactive-prompt";

const BOTPRESS_INJECT_URL =
  "https://cdn.botpress.cloud/webchat/v3.7/inject.js";

type BotpressScriptsProps = {
  configUrl: string;
};

type BotpressApi = {
  on?: (
    event: "webchat:initialized",
    callback: () => void,
  ) => void | (() => void);
  open?: () => void;
};

function getBotpressApi() {
  return (window as typeof window & { botpress?: BotpressApi }).botpress;
}

export function BotpressScripts({ configUrl }: BotpressScriptsProps) {
  const [isLoaderReady, setIsLoaderReady] = useState(false);
  const [isWebchatReady, setIsWebchatReady] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      unsubscribeRef.current?.();
    },
    [],
  );

  function handleLoaderReady() {
    unsubscribeRef.current?.();

    const unsubscribe = getBotpressApi()?.on?.(
      "webchat:initialized",
      () => setIsWebchatReady(true),
    );

    unsubscribeRef.current =
      typeof unsubscribe === "function" ? unsubscribe : null;
    setIsLoaderReady(true);
  }

  return (
    <>
      <Script
        id="revrecovery-botpress-inject"
        src={BOTPRESS_INJECT_URL}
        strategy="lazyOnload"
        onReady={handleLoaderReady}
      />
      {isLoaderReady ? (
        <Script
          id="revrecovery-botpress-config"
          src={configUrl}
          strategy="afterInteractive"
        />
      ) : null}
      <BotpressProactivePrompt
        isReady={isWebchatReady}
        onOpen={() => getBotpressApi()?.open?.()}
      />
    </>
  );
}
