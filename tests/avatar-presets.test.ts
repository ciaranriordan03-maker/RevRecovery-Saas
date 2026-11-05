import { describe, expect, it } from "vitest";
import { AVATAR_PRESETS } from "../app/components/avatar";

describe("account avatar presets", () => {
  it("offers eight stable and distinct choices", () => {
    expect(AVATAR_PRESETS).toHaveLength(8);
    expect(new Set(AVATAR_PRESETS.map((preset) => preset.id)).size).toBe(8);
    expect(new Set(AVATAR_PRESETS.map((preset) => preset.seed)).size).toBe(8);
  });

  it("includes varied hair and facial presentation", () => {
    const longHairChoices = AVATAR_PRESETS.filter(
      (preset) => preset.options.rearHairProbability === 100,
    );
    const shortHairChoices = AVATAR_PRESETS.filter(
      (preset) => preset.options.rearHairProbability === 0,
    );
    const beardedChoices = AVATAR_PRESETS.filter(
      (preset) => preset.options.beardProbability === 100,
    );

    expect(longHairChoices.length).toBeGreaterThanOrEqual(4);
    expect(shortHairChoices.length).toBeGreaterThanOrEqual(4);
    expect(beardedChoices.length).toBeGreaterThanOrEqual(1);
  });
});
