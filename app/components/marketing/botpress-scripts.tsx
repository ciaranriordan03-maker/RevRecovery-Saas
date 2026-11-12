"use client";

import Script from "next/script";
import { useState } from "react";

const BOTPRESS_INJECT_URL =
  "https://cdn.botpress.cloud/webchat/v3.7/inject.js";

type BotpressScriptsProps = {
  configUrl: string;
};

export function BotpressScripts({ configUrl }: BotpressScriptsProps) {
  const [isLoaderReady, setIsLoaderReady] = useState(false);

  return (
    <>
      <Script
        id="revrecovery-botpress-inject"
        src={BOTPRESS_INJECT_URL}
        strategy="lazyOnload"
        onReady={() => setIsLoaderReady(true)}
      />
      {isLoaderReady ? (
        <Script
          id="revrecovery-botpress-config"
          src={configUrl}
          strategy="afterInteractive"
        />
      ) : null}
    </>
  );
}
