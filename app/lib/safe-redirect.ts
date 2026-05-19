const ALLOWED_APP_REDIRECT_PREFIXES = [
  "/dashboard",
  "/onboarding",
  "/login",
  "/signup",
  "/reset-password",
];

export function sanitizeAppRedirect(value: string | null | undefined, fallback = "/onboarding") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  try {
    const parsed = new URL(value, "https://revrecovery.local");

    if (parsed.origin !== "https://revrecovery.local") {
      return fallback;
    }

    const sanitized = `${parsed.pathname}${parsed.search}`;
    const isAllowed = ALLOWED_APP_REDIRECT_PREFIXES.some(
      (prefix) => parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`),
    );

    return isAllowed ? sanitized : fallback;
  } catch {
    return fallback;
  }
}
