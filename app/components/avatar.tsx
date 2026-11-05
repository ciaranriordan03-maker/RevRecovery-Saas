import { createAvatar } from "@dicebear/core";
import * as toonHead from "@dicebear/toon-head";
import type { Options as ToonHeadOptions } from "@dicebear/toon-head";

const AVATAR_COLORS = [
  "eef2ff",
  "e0f2fe",
  "f5f3ff",
  "ecfdf5",
  "fff7ed",
  "f8fafc",
];

function getDefaultPalette(property: "hairColor" | "skinColor") {
  const definition = toonHead.schema.properties?.[property];

  if (
    !definition ||
    typeof definition === "boolean" ||
    !Array.isArray(definition.default) ||
    definition.default.length < 5 ||
    !definition.default.every((color) => typeof color === "string")
  ) {
    throw new Error(`ToonHead ${property} palette is unavailable.`);
  }

  return definition.default as [string, string, string, string, string];
}

const [BLACK_HAIR, AUBURN_HAIR, BROWN_HAIR, BLONDE_HAIR, DARK_BROWN_HAIR] =
  getDefaultPalette("hairColor");
const [LIGHT_SKIN, MEDIUM_SKIN, TAN_SKIN, BROWN_SKIN, DARK_SKIN] =
  getDefaultPalette("skinColor");

type AvatarPreset = {
  id: string;
  label: string;
  options: ToonHeadOptions;
  seed: string;
};

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: "revrecovery-avatar-maya",
    label: "Maya",
    options: {
      beardProbability: 0,
      clothes: ["dress"],
      hair: ["bun"],
      hairColor: [AUBURN_HAIR],
      rearHair: ["longWavy"],
      rearHairProbability: 100,
      skinColor: [LIGHT_SKIN],
    },
    seed: "Maya",
  },
  {
    id: "revrecovery-avatar-amara",
    label: "Amara",
    options: {
      beardProbability: 0,
      clothes: ["openJacket"],
      hair: ["bun"],
      hairColor: [BLACK_HAIR],
      rearHair: ["shoulderHigh"],
      rearHairProbability: 100,
      skinColor: [DARK_SKIN],
    },
    seed: "Bella",
  },
  {
    id: "revrecovery-avatar-zoe",
    label: "Zoe",
    options: {
      beardProbability: 0,
      clothes: ["turtleNeck"],
      hair: ["sideComed"],
      hairColor: [BLONDE_HAIR],
      rearHair: ["longStraight"],
      rearHairProbability: 100,
      skinColor: [LIGHT_SKIN],
    },
    seed: "Zoe",
  },
  {
    id: "revrecovery-avatar-nia",
    label: "Nia",
    options: {
      beardProbability: 0,
      clothes: ["shirt"],
      hair: ["bun"],
      hairColor: [BLACK_HAIR],
      rearHair: ["neckHigh"],
      rearHairProbability: 100,
      skinColor: [BROWN_SKIN],
    },
    seed: "Sasha",
  },
  {
    id: "revrecovery-avatar-leo",
    label: "Leo",
    options: {
      beardProbability: 0,
      clothes: ["openJacket"],
      hair: ["undercut"],
      hairColor: [BROWN_HAIR],
      rearHairProbability: 0,
      skinColor: [MEDIUM_SKIN],
    },
    seed: "Jin",
  },
  {
    id: "revrecovery-avatar-marcus",
    label: "Marcus",
    options: {
      beard: ["fullBeard"],
      beardProbability: 100,
      clothes: ["shirt"],
      hair: ["spiky"],
      hairColor: [BLACK_HAIR],
      rearHairProbability: 0,
      skinColor: [DARK_SKIN],
    },
    seed: "Marcus",
  },
  {
    id: "revrecovery-avatar-jordan",
    label: "Jordan",
    options: {
      beardProbability: 0,
      clothes: ["tShirt"],
      hair: ["sideComed"],
      hairColor: [DARK_BROWN_HAIR],
      rearHairProbability: 0,
      skinColor: [TAN_SKIN],
    },
    seed: "Jordan",
  },
  {
    id: "revrecovery-avatar-kai",
    label: "Kai",
    options: {
      beardProbability: 0,
      clothes: ["turtleNeck"],
      hair: ["undercut"],
      hairColor: [BLONDE_HAIR],
      rearHairProbability: 0,
      skinColor: [MEDIUM_SKIN],
    },
    seed: "Kai",
  },
];

function getAvatarSeed(seed: string | null | undefined) {
  const normalizedSeed = seed?.trim();

  return normalizedSeed && normalizedSeed.length > 0
    ? normalizedSeed.toLowerCase()
    : "revrecovery-user";
}

export function DiceBearAvatar({
  alt = "User avatar",
  className = "",
  seed,
  size = 40,
}: {
  alt?: string;
  className?: string;
  seed?: string | null;
  size?: number;
}) {
  const preset = AVATAR_PRESETS.find((option) => option.id === seed);
  const avatar = createAvatar(toonHead, {
    ...preset?.options,
    backgroundColor: AVATAR_COLORS,
    radius: 50,
    seed: preset?.seed ?? getAvatarSeed(seed),
    size: 96,
  });

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      className={`shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface)] object-cover ${className}`}
      height={size}
      src={avatar.toDataUri()}
      width={size}
    />
  );
}
