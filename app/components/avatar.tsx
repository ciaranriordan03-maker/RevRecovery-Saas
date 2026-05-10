import { createAvatar } from "@dicebear/core";
import * as toonHead from "@dicebear/toon-head";

const AVATAR_COLORS = [
  "eef2ff",
  "e0f2fe",
  "f5f3ff",
  "ecfdf5",
  "fff7ed",
  "f8fafc",
];

function getAvatarSeed(seed: string | null | undefined) {
  const normalizedSeed = seed?.trim();

  return normalizedSeed && normalizedSeed.length > 0
    ? normalizedSeed.toLowerCase()
    : "recoverflow-user";
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
  const avatar = createAvatar(toonHead, {
    backgroundColor: AVATAR_COLORS,
    radius: 50,
    seed: getAvatarSeed(seed),
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
