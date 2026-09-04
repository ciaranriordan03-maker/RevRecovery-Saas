"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "../button";

type SendingDomain = {
  dnsRecords: Array<{ name: string; priority: number | null; status: string; ttl: string; type: string; value: string }>;
  domain: string;
  failureReason: string | null;
  status: "pending" | "verified" | "failed" | "disabled";
  verifiedAt: string | null;
};

const fieldClassName = "h-[50px] w-full rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] disabled:cursor-not-allowed disabled:bg-[var(--background)]";

function message(payload: unknown, fallback: string) {
  return payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string" ? payload.error : fallback;
}
export function SendingDomainSettings() {
  const [domain, setDomain] = useState("");
  const [current, setCurrent] = useState<SendingDomain | null>(null);
  const [busy, setBusy] = useState(true);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/recovery/sending-domain")
      .then(async (response) => ({ payload: await response.json(), response }))
      .then(({ payload, response }) => {
        if (!active) return;
        if (!response.ok) throw new Error(message(payload, "Unable to load sending domain."));
        setCurrent((payload as { sendingDomain: SendingDomain | null }).sendingDomain);
      })
      .catch((error) => active && setStatus(error instanceof Error ? error.message : "Unable to load sending domain."))
      .finally(() => active && setBusy(false));
    return () => { active = false; };
  }, []);

  async function request(path: string, body?: object) {
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch(path, { body: body ? JSON.stringify(body) : undefined, headers: body ? { "Content-Type": "application/json" } : undefined, method: "POST" });
      const payload = await response.json() as { error?: string; sendingDomain?: SendingDomain };
      if (!response.ok || !payload.sendingDomain) throw new Error(message(payload, "Unable to update sending domain."));
      setCurrent(payload.sendingDomain);
      setStatus(payload.sendingDomain.status === "verified" ? "Domain verified." : "Domain status refreshed. DNS changes can take time to propagate.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update sending domain.");
    } finally { setBusy(false); }
  }

  function register(event: FormEvent) {
    event.preventDefault();
    void request("/api/recovery/sending-domain", { domain });
  }

  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)] lg:col-span-2">
      <h2 className="text-base font-medium text-[var(--foreground)]">Customer-facing sending domain</h2>
      <p className="mt-2 max-w-3xl text-sm leading-5 text-[var(--muted-strong)]">
        Verify a domain so future recovery emails can be sent using your brand. We recommend a dedicated subdomain such as updates.yourcompany.com.
      </p>
      {!current ? (
        <form className="mt-5 flex max-w-2xl flex-col gap-3 sm:flex-row" onSubmit={register}>
          <label className="flex-1 text-sm font-medium text-[var(--foreground)]">
            Sending subdomain
            <input className={`${fieldClassName} mt-2`} disabled={busy} onChange={(event) => setDomain(event.target.value)} placeholder="updates.yourcompany.com" required value={domain} />
          </label>
          <Button className="sm:mt-7" disabled={busy} type="submit">{busy ? "Loading…" : "Register domain"}</Button>
        </form>
      ) : (
        <div className="mt-5">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-medium text-[var(--foreground)]">{current.domain}</p>
            <span className="rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-medium capitalize text-[var(--primary)]">{current.status}</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
            Add every record below at your DNS provider exactly as shown, then start verification. DNS changes may take up to 72 hours.
          </p>
          <div className="mt-4 overflow-x-auto rounded-[var(--radius-control)] border border-[var(--border)]">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-[var(--background)] text-[var(--muted-strong)]"><tr><th className="p-3">Type</th><th className="p-3">Name</th><th className="p-3">Value</th><th className="p-3">Priority</th><th className="p-3">Status</th></tr></thead>
              <tbody>{current.dnsRecords.map((record, index) => <tr className="border-t border-[var(--border)]" key={`${record.type}-${record.name}-${index}`}><td className="p-3 font-medium">{record.type}</td><td className="p-3 font-mono">{record.name}</td><td className="max-w-md break-all p-3 font-mono">{record.value}</td><td className="p-3">{record.priority ?? "—"}</td><td className="p-3 capitalize">{record.status}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button disabled={busy || current.status === "verified"} onClick={() => void request("/api/recovery/sending-domain/verify")} type="button">Verify domain</Button>
            <Button disabled={busy} onClick={() => void request("/api/recovery/sending-domain/status")} type="button" variant="secondary">Check status</Button>
          </div>
        </div>
      )}
      <p aria-live="polite" className="mt-4 text-sm text-[var(--muted-strong)]">{status}</p>
      <p className="mt-3 border-t border-[var(--border)] pt-3 text-xs leading-5 text-[var(--muted)]">
        {current?.status === "verified"
          ? `Recovery emails will use recoveries@${current.domain}. Customer replies will continue going to your saved reply-to address.`
          : "RevRecovery will keep using its platform sender until this domain is verified. Customer replies will continue going to your saved reply-to address."}
      </p>
    </section>
  );
}
