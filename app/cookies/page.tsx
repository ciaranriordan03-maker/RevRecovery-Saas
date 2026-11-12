/* eslint-disable react/no-unescaped-entities -- This route is intentionally long-form legal prose. */
import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalCallout,
  LegalList,
  LegalPage,
  LegalSection,
  LegalSubsection,
} from "../components/legal/legal-page";
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_OPERATOR_NAME,
  LEGAL_POSTAL_ADDRESS,
} from "../lib/legal";

export const metadata: Metadata = {
  title: "Cookie Notice | RevRecovery",
  description: "How RevRecovery uses cookies and similar browser technologies.",
};

export default function CookiesPage() {
  return (
    <LegalPage
      description="This notice explains the cookies and similar browser technologies used by the RevRecovery website and application."
      title="Cookie Notice"
    >
      <LegalCallout>
        <p className="font-semibold">The short version</p>
        <p className="mt-1">RevRecovery uses essential authentication and security storage. Our configured Plausible analytics does not set analytics cookies or create persistent visitor identifiers. We do not use advertising cookies.</p>
      </LegalCallout>

      <LegalSection title="1. What cookies and browser storage are">
        <p>Cookies are small pieces of data stored by a website in your browser. Similar technologies include local storage and session storage. They can keep you signed in, protect a connection flow, remember an optional conversation, or support analytics.</p>
      </LegalSection>

      <LegalSection title="2. Technologies RevRecovery uses">
        <LegalSubsection title="Essential authentication storage">
          <p>Supabase authentication uses first-party cookies to create and refresh a signed-in session, complete account confirmation or password recovery, and protect authentication flows. Names may include an `sb-&lt;project&gt;-auth-token` family and a short-lived code-verifier value.</p>
          <p>These are necessary for the account and security features you request. Session duration depends on authentication and refresh settings; short-lived verification values expire after their flow completes.</p>
        </LegalSubsection>

        <LegalSubsection title="Stripe connection security">
          <p>RevRecovery uses a short-lived, HttpOnly `stripe_connect_state` cookie while you connect Stripe. It binds the return from Stripe to the browser that started the connection and helps prevent request forgery. It is cleared after the callback flow.</p>
        </LegalSubsection>

        <LegalSubsection title="Privacy-friendly website analytics">
          <p>When enabled, Plausible Analytics records aggregate website activity such as page path, referral source, device category, and fixed events. Plausible does not set analytics cookies or write persistent visitor identifiers to local storage. Our configuration removes query strings and fragments and excludes account emails, Stripe identifiers, customer records, payment details, and calculator inputs.</p>
        </LegalSubsection>

        <LegalSubsection title="Optional website assistant">
          <p>When the website assistant is enabled and you choose to use it, Botpress may use local or session storage to maintain the conversation or remember it between visits, depending on the assistant configuration. Botpress also receives the messages you submit and limited technical information needed to provide the chat. Do not enter passwords, full card details, or sensitive personal data.</p>
          <p>You can avoid this processing by not using the assistant, and you can remove its local data through your browser's site-data controls.</p>
        </LegalSubsection>

        <LegalSubsection title="Third-party pages">
          <p>If you follow a link to Stripe checkout, Stripe Connect, or another third-party site, that provider may use its own cookies under its own notice. Those cookies are not set by the RevRecovery page you left.</p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection title="3. Why consent is not requested for essential storage">
        <p>Authentication and connection-security storage is used only to provide a service or security flow you explicitly request. It is not used for advertising. Plausible is configured without analytics cookies or persistent browser storage.</p>
        <p>If RevRecovery later introduces non-essential cookies or similar storage that requires consent, we will update this notice and provide an appropriate choice before using them.</p>
      </LegalSection>

      <LegalSection title="4. Your browser choices">
        <LegalList>
          <li>You can inspect, block, or delete cookies and site data through your browser settings.</li>
          <li>Blocking essential authentication cookies will prevent sign-in, password recovery, and some connected-account flows from working.</li>
          <li>Clearing local or session storage may reset an optional assistant conversation.</li>
          <li>Browser privacy tools may block Plausible requests; RevRecovery continues to work if analytics is blocked.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="5. More information">
        <p>See our <Link className="font-medium text-[var(--primary-text)] underline" href="/privacy">Privacy Notice</Link> for the personal data, purposes, providers, retention criteria, and rights that apply more broadly.</p>
        <p>Questions can be sent to <a className="font-medium text-[var(--primary-text)] underline" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>, or by post to {LEGAL_OPERATOR_NAME}, {LEGAL_POSTAL_ADDRESS}.</p>
      </LegalSection>
    </LegalPage>
  );
}
