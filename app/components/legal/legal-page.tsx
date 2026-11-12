import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "../brand";
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_LAST_UPDATED,
  LEGAL_OPERATOR_NAME,
  LEGAL_POSTAL_ADDRESS,
  legalLinks,
} from "../../lib/legal";

type LegalPageProps = {
  children: ReactNode;
  description: string;
  title: string;
};

export function LegalPage({ children, description, title }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-[var(--surface-muted)] text-[var(--foreground)]">
      <header className="border-b border-[var(--marketing-border)] bg-white">
        <div className="mx-auto flex min-h-16 max-w-[1180px] items-center justify-between gap-5 px-5 sm:px-8">
          <Link aria-label="RevRecovery home" href="/">
            <BrandMark variant="dashboard" />
          </Link>
          <div className="flex items-center gap-4 text-sm font-medium">
            <Link className="text-[var(--muted-strong)] hover:text-[var(--foreground)]" href="/">
              Home
            </Link>
            <Link className="rounded-[8px] bg-[var(--primary)] px-4 py-2.5 text-white hover:bg-[var(--primary-hover)]" href="/login">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-5 py-10 sm:px-8 sm:py-14">
        <div className="max-w-[780px]">
          <p className="marketing-eyebrow">Legal</p>
          <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-[720px] text-base leading-7 text-[var(--muted)]">{description}</p>
          <p className="mt-4 text-sm text-[var(--muted)]">Last updated {LEGAL_LAST_UPDATED}</p>
        </div>

        <div className="mt-10 grid gap-7 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
          <nav aria-label="Legal documents" className="rounded-[14px] border border-[var(--marketing-border)] bg-white p-3 lg:sticky lg:top-6">
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Documents</p>
            <ul className="mt-1 grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link className="block rounded-[8px] px-3 py-2.5 text-sm font-medium text-[var(--muted-strong)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary-text)]" href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <article className="rounded-[14px] border border-[var(--marketing-border)] bg-white px-6 py-8 shadow-[var(--shadow-subtle)] sm:px-10 sm:py-10">
            <div className="space-y-10 text-sm leading-7 text-[var(--muted-strong)]">{children}</div>
          </article>
        </div>
      </main>

      <footer className="border-t border-[var(--marketing-border)] bg-white px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-4 text-sm text-[var(--muted)] sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-medium text-[var(--foreground)]">RevRecovery is operated by {LEGAL_OPERATOR_NAME}.</p>
            <address className="mt-1 not-italic">{LEGAL_POSTAL_ADDRESS}</address>
          </div>
          <a className="font-medium text-[var(--primary-text)] hover:text-[var(--primary)]" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>
        </div>
      </footer>
    </div>
  );
}

export function LegalSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section>
      <h2 className="text-xl font-semibold tracking-[-0.02em] text-[var(--foreground)] sm:text-2xl">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function LegalSubsection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div>
      <h3 className="font-semibold text-[var(--foreground)]">{title}</h3>
      <div className="mt-2 space-y-3">{children}</div>
    </div>
  );
}

export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5 marker:text-[var(--primary)]">{children}</ul>;
}

export function LegalCallout({ children }: { children: ReactNode }) {
  return <div className="rounded-[12px] border border-[var(--primary-border)] bg-[var(--primary-soft)] p-4 text-[var(--primary-text)]">{children}</div>;
}
