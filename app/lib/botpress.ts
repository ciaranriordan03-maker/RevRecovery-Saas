const BOTPRESS_CONFIG_HOST = "files.bpcontent.cloud";

export function parseBotpressConfigUrl(value: string | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value);
    const isAllowed =
      url.protocol === "https:" &&
      url.hostname === BOTPRESS_CONFIG_HOST &&
      url.pathname.endsWith(".js") &&
      !url.username &&
      !url.password;

    return isAllowed ? url.href : null;
  } catch {
    return null;
  }
}
