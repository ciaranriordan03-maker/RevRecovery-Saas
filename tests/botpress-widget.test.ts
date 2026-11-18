import { describe, expect, it } from "vitest";
import { parseBotpressConfigUrl } from "../app/lib/botpress";
import {
  BOTPRESS_PROMPT_DELAY_MS,
  BOTPRESS_PROMPT_STORAGE_KEY,
  markBotpressPromptSeen,
  shouldShowBotpressPrompt,
} from "../app/lib/botpress-prompt";

describe("Botpress webchat configuration", () => {
  it("accepts Botpress-hosted HTTPS JavaScript configuration", () => {
    expect(
      parseBotpressConfigUrl(
        "https://files.bpcontent.cloud/2026/11/12/example-config.js",
      ),
    ).toBe(
      "https://files.bpcontent.cloud/2026/11/12/example-config.js",
    );
  });

  it.each([
    undefined,
    "",
    "not-a-url",
    "http://files.bpcontent.cloud/example.js",
    "https://example.com/example.js",
    "https://files.bpcontent.cloud/example.json",
    "https://user:password@files.bpcontent.cloud/example.js",
  ])("rejects an unsafe configuration URL: %s", (value) => {
    expect(parseBotpressConfigUrl(value)).toBeNull();
  });

  it("shows the proactive invitation once after a short delay", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };

    expect(BOTPRESS_PROMPT_DELAY_MS).toBe(10_000);
    expect(shouldShowBotpressPrompt(storage)).toBe(true);

    markBotpressPromptSeen(storage);

    expect(values.get(BOTPRESS_PROMPT_STORAGE_KEY)).toBe("seen");
    expect(shouldShowBotpressPrompt(storage)).toBe(false);
  });

  it("fails open when browser storage is unavailable", () => {
    const storage = {
      getItem: () => {
        throw new Error("Storage unavailable");
      },
      setItem: () => {
        throw new Error("Storage unavailable");
      },
    };

    expect(shouldShowBotpressPrompt(storage)).toBe(true);
    expect(() => markBotpressPromptSeen(storage)).not.toThrow();
  });
});
