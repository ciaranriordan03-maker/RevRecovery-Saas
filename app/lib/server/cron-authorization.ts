function getCronSecrets() {
  return [
    process.env.RECOVERY_EMAIL_CRON_SECRET?.trim(),
    process.env.CRON_SECRET?.trim(),
  ].filter((secret): secret is string => Boolean(secret));
}

export function isRecoveryCronAuthorized(request: Request) {
  const cronSecrets = getCronSecrets();

  if (cronSecrets.length === 0) {
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  return cronSecrets.some(
    (secret) => bearerToken === secret || headerSecret === secret,
  );
}
