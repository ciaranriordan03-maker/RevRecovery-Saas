import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getSupabasePublishableKey,
  getSupabaseSecretKey,
  getSupabaseUrl,
  hasSupabaseBrowserEnv,
  hasSupabaseServerEnv,
} from "../app/lib/supabase/env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Supabase environment configuration", () => {
  it("reports missing browser and server configuration", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");

    expect(hasSupabaseBrowserEnv()).toBe(false);
    expect(hasSupabaseServerEnv()).toBe(false);
  });

  it("normalizes values copied from environment files", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_URL=https://project.supabase.co",
    );
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "'publishable-key'");
    vi.stubEnv("SUPABASE_SECRET_KEY", '"server-secret"');

    expect(getSupabaseUrl()).toBe("https://project.supabase.co");
    expect(getSupabasePublishableKey()).toBe("publishable-key");
    expect(getSupabaseSecretKey()).toBe("server-secret");
    expect(hasSupabaseBrowserEnv()).toBe(true);
    expect(hasSupabaseServerEnv()).toBe(true);
  });

  it("ignores an accidentally pasted second KEY=value pair", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_URL=https://project.supabase.co SUPABASE_SECRET_KEY=do-not-use",
    );

    expect(getSupabaseUrl()).toBe("https://project.supabase.co");
  });
});
