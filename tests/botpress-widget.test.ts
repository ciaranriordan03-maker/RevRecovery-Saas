import { describe, expect, it } from "vitest";
import { parseBotpressConfigUrl } from "../app/lib/botpress";

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
});
