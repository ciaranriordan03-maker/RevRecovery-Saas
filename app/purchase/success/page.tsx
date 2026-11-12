import type { Metadata } from "next";
import Link from "next/link";
import { DEFAULT_CUSTOMER_SETUP_URL, buildSignupUrl } from "../../lib/billing/welcome-email";
import { createStripePlatformClient } from "../../lib/stripe/server";

export const metadata: Metadata = {
  title: "Welcome | RevRecovery",
  description: "Create your RevRecovery account and book your guided setup.",
};

type PurchaseSuccessPageProps = {
  searchParams?: Promise<{ session_id?: string }>;
};

export default async function PurchaseSuccessPage({
  searchParams,
}: PurchaseSuccessPageProps) {
  const params = await searchParams;
  const sessionId = params?.session_id?.trim();
  const stripe = createStripePlatformClient();
  const expectedPaymentLinkId =
    process.env.STRIPE_FOUNDING_MEMBER_PAYMENT_LINK_ID?.trim();
  let email: string | null = null;
  let purchaseConfirmed = false;

  if (stripe && sessionId && expectedPaymentLinkId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const paymentLinkId =
        typeof session.payment_link === "string"
          ? session.payment_link
          : session.payment_link?.id;
      purchaseConfirmed =
        session.payment_status === "paid" && paymentLinkId === expectedPaymentLinkId;
      email = session.customer_details?.email || session.customer_email || null;
    } catch {
      purchaseConfirmed = false;
    }
  }

  const appUrl = process.env.CUSTOMER_APP_URL?.trim();
  const signupUrl =
    purchaseConfirmed && email && appUrl ? buildSignupUrl(appUrl, email) : null;
  const setupUrl =
    process.env.CUSTOMER_SETUP_URL?.trim() || DEFAULT_CUSTOMER_SETUP_URL;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--auth-background)] px-5 py-12 text-[var(--foreground)]">
      <section className="w-full max-w-2xl rounded-[14px] bg-white p-8 sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">
          Founding member
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[var(--auth-heading)]">
          {purchaseConfirmed ? "Welcome to RevRecovery" : "Let’s finish your setup"}
        </h1>
        <p className="mt-4 leading-7 text-[var(--muted-strong)]">
          {purchaseConfirmed
            ? "Your payment is confirmed. Create your account next, then book a guided setup call so we can connect Stripe in Test mode and get everything ready safely."
            : "We could not verify this payment session from the link. Check your welcome email for the account and setup links, or contact Ciarán for help."}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {signupUrl ? (
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-[8px] bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
              href={signupUrl}
            >
              Create your account
            </Link>
          ) : null}
          <a
            className="inline-flex min-h-11 items-center justify-center rounded-[8px] border border-[var(--border-strong)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold text-[var(--text-subtle)] hover:bg-[var(--surface-muted)]"
            href={setupUrl}
          >
            Book your setup call
          </a>
        </div>

        <p className="mt-7 text-sm leading-6 text-[var(--muted)]">
          A welcome email containing both links is also sent to the email used at checkout.
          Nothing is activated for live customers automatically.
        </p>
      </section>
    </main>
  );
}
