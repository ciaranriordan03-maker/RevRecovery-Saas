import { createHash } from "node:crypto";

import { NextResponse } from "next/server";
import {
  getSupabasePublishableKey,
  getSupabaseSecretKey,
  getSupabaseUrl,
} from "../../../lib/supabase/env";

export const runtime = "nodejs";

function fingerprint(value: string | null) {
  if (!value) {
    return null;
  }

  return {
    endsWith: value.slice(-6),
    hash: createHash("sha256").update(value).digest("hex").slice(0, 12),
    length: value.length,
    prefix: value.split("_").slice(0, 2).join("_"),
  };
}

function getProjectRef(url: string | null) {
  if (!url) {
    return null;
  }

  try {
    return new URL(url).hostname.split(".")[0] ?? null;
  } catch {
    return null;
  }
}

async function checkSupabaseSettings(url: string | null, publishableKey: string | null) {
  if (!url || !publishableKey) {
    return {
      ok: false,
      status: null,
      statusText: "Missing Supabase URL or publishable key",
    };
  }

  try {
    const response = await fetch(`${url}/auth/v1/settings`, {
      cache: "no-store",
      headers: {
        apikey: publishableKey,
        authorization: `Bearer ${publishableKey}`,
      },
    });
    const body = await response.text();

    return {
      bodyPreview: body.slice(0, 160),
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      statusText: error instanceof Error ? error.message : "Supabase check failed",
    };
  }
}

export async function GET() {
  const url = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();
  const secretKey = getSupabaseSecretKey();
  const settingsCheck = await checkSupabaseSettings(url, publishableKey);

  return NextResponse.json({
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    publishableKey: fingerprint(publishableKey),
    secretKey: fingerprint(secretKey),
    settingsCheck,
    supabaseProjectRef: getProjectRef(url),
    supabaseUrlHost: url ? new URL(url).hostname : null,
  });
}
