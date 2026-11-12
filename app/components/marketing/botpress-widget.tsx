import { parseBotpressConfigUrl } from "../../lib/botpress";
import { BotpressScripts } from "./botpress-scripts";

export function BotpressWidget() {
  const configUrl = parseBotpressConfigUrl(
    process.env.NEXT_PUBLIC_BOTPRESS_CONFIG_URL,
  );

  if (!configUrl) return null;

  return <BotpressScripts configUrl={configUrl} />;
}
