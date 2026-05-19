import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { getSupabaseSecretKey } from "../supabase/env";

const TOKEN_PREFIX = "enc:v1:";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionSecret() {
  return process.env.STRIPE_TOKEN_ENCRYPTION_KEY?.trim() ?? getSupabaseSecretKey();
}

function getEncryptionKey() {
  const secret = getEncryptionSecret();

  if (!secret) {
    throw new Error("STRIPE_TOKEN_ENCRYPTION_KEY is required to store Stripe tokens securely.");
  }

  return createHash("sha256").update(secret).digest();
}

export function encryptStripeToken(token: string) {
  if (token.startsWith(TOKEN_PREFIX)) {
    return token;
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${TOKEN_PREFIX}${Buffer.concat([iv, authTag, encrypted]).toString("base64url")}`;
}

export function isEncryptedStripeToken(token: string | null | undefined) {
  return Boolean(token?.startsWith(TOKEN_PREFIX));
}

export function decryptStripeToken(token: string) {
  if (!token.startsWith(TOKEN_PREFIX)) {
    return token;
  }

  const payload = Buffer.from(token.slice(TOKEN_PREFIX.length), "base64url");
  const iv = payload.subarray(0, IV_LENGTH);
  const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
