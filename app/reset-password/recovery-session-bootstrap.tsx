"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { createClient } from "../lib/supabase/client";

type RecoverySessionState = "checking" | "ready" | "invalid";

export function RecoverySessionBootstrap({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RecoverySessionState>("checking");

  useEffect(() => {
    let active = true;

    async function establishRecoverySession() {
      const supabase = createClient();
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const isRecovery = hashParams.get("type") === "recovery";

      if (accessToken && refreshToken && isRecovery) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!error) {
          window.history.replaceState(
            null,
            "",
            `${window.location.pathname}${window.location.search}`,
          );
          if (active) setState("ready");
          return;
        }
      }

      const { data, error } = await supabase.auth.getSession();
      if (active) {
        setState(!error && data.session ? "ready" : "invalid");
      }
    }

    void establishRecoverySession();
    return () => {
      active = false;
    };
  }, []);

  if (state === "checking") {
    return (
      <p
        aria-live="polite"
        className="text-sm font-medium text-[var(--auth-copy)]"
      >
        Verifying your secure reset link…
      </p>
    );
  }

  if (state === "invalid") {
    return (
      <div className="space-y-4" role="alert">
        <p className="text-sm font-medium text-[var(--auth-copy)]">
          This reset link is invalid or has expired. Request a fresh link to
          continue.
        </p>
        <Link
          className="inline-flex h-[46px] items-center justify-center rounded-[14px] bg-[var(--primary)] px-5 text-sm font-semibold text-white"
          href="/forgot-password"
        >
          Request another reset link
        </Link>
      </div>
    );
  }

  return children;
}
