/* eslint-disable max-lines, react/no-unescaped-entities -- This route is intentionally long-form legal prose. */
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
  LEGAL_TRADING_NAME,
} from "../lib/legal";

export const metadata: Metadata = {
  title: "Privacy Notice | RevRecovery",
  description: "How RevRecovery collects, uses, shares, and protects personal data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      description="This notice explains how RevRecovery handles personal data when you visit our website, create an account, connect Stripe, use the service, or contact us."
      title="Privacy Notice"
    >
      <LegalCallout>
        <p className="font-semibold">The short version</p>
        <p className="mt-1">
          RevRecovery uses account, Stripe billing, recovery, and technical data to provide and secure the service. We do not sell personal data. SaaS businesses control the customer data they connect to RevRecovery; we process that data to provide the service to them.
        </p>
      </LegalCallout>

      <LegalSection title="1. Who is responsible for your data">
        <p>
          {LEGAL_OPERATOR_NAME}, trading as {LEGAL_TRADING_NAME} ("RevRecovery", "we", "us"), is the controller of personal data about website visitors, account holders, prospective customers, and people who contact us directly.
        </p>
        <p>
          When a SaaS business connects its Stripe account and uses RevRecovery for its own customers, that business is normally the controller of its customer data and RevRecovery acts as its processor. If you are the customer of a business using RevRecovery, contact that business first about your data rights. We will assist it as required.
        </p>
        <p>
          Privacy questions and rights requests can be sent to <a className="font-medium text-[var(--primary-text)] underline" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a> or by post to {LEGAL_POSTAL_ADDRESS}.
        </p>
      </LegalSection>

      <LegalSection title="2. What this notice covers">
        <p>This notice covers the RevRecovery website, application, support communications, service emails, and optional website assistant. It does not govern a third party's own website or service, even when we link to it.</p>
      </LegalSection>

      <LegalSection title="3. Personal data we handle">
        <LegalSubsection title="Account and business information">
          <LegalList>
            <li>Name, business name, work email address, profile preferences, avatar selection, authentication information, and account status.</li>
            <li>Recovery configuration, sender identity, approved test recipient, message templates, timing, timezone, and account settings.</li>
            <li>Subscription, checkout, payment status, and billing records for your RevRecovery plan. Stripe handles complete card details; RevRecovery does not store full payment-card numbers.</li>
          </LegalList>
        </LegalSubsection>

        <LegalSubsection title="Connected Stripe and recovery information">
          <LegalList>
            <li>Connected Stripe account identifiers, display name, account email, permissions, connection status, and encrypted connection tokens.</li>
            <li>Customer, subscription, product, price, invoice, payment-attempt, amount, currency, billing-cycle, failure, and recovery-status information received from Stripe.</li>
            <li>Customer email addresses where needed to send configured recovery messages, plus message subject, content, schedule, delivery status, opens, clicks, bounces, complaints, and provider identifiers.</li>
            <li>Recovery cases, state changes, pauses, suppressions, test records, and audit evidence used to prevent duplicate or unsafe delivery.</li>
          </LegalList>
        </LegalSubsection>

        <LegalSubsection title="Website, support, and technical information">
          <LegalList>
            <li>Support requests, feedback, and information you choose to provide in email or the website assistant. Do not submit payment-card details, passwords, or special-category personal data in chat.</li>
            <li>IP address, browser and device information, request timestamps, security events, error details, and limited diagnostic data used to operate and protect the service.</li>
            <li>Privacy-friendly website analytics such as page paths, referral source, browser or device category, approximate location, and fixed event categories. Query strings, URL fragments, customer records, payment details, and calculator inputs are excluded from our configured analytics events.</li>
          </LegalList>
        </LegalSubsection>

        <LegalSubsection title="Business prospect information">
          <LegalList>
            <li>Name, work email address, job title, company, and public business-profile details.</li>
            <li>Public information about a company's subscription product, pricing, team, billing technology, and failed-payment or recovery workflow where relevant to RevRecovery.</li>
            <li>The public source of the information, our relevance and qualification notes, outreach status, correspondence, replies, objections, and suppression status.</li>
            <li>Where HubSpot makes it available, limited delivery, open, click, reply, task, and sequence-status information about our business outreach.</li>
          </LegalList>
        </LegalSubsection>
      </LegalSection>

      <LegalSection title="4. Where the data comes from">
        <LegalList>
          <li>Directly from you when you register, configure the service, subscribe, contact us, or use the website assistant.</li>
          <li>From the Stripe account you choose to connect and from Stripe webhook events.</li>
          <li>From email delivery events supplied by Resend.</li>
          <li>Automatically from your browser, device, and use of the website or application.</li>
          <li>From the SaaS business that uses RevRecovery when you are one of its customers or payment contacts.</li>
          <li>For business prospect outreach, from publicly accessible business sources such as company websites, product and launch pages, public professional profiles, and business directories, and from information you provide when you reply or speak with us.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="5. Why we use personal data and our legal bases">
        <LegalSubsection title="Provide the service — contract">
          <p>We create and secure accounts, connect Stripe, identify failed payments, schedule and send configured recovery messages, update cases, show reporting, provide support, and administer subscriptions.</p>
        </LegalSubsection>
        <LegalSubsection title="Operate and improve RevRecovery — legitimate interests">
          <p>We troubleshoot errors, monitor service health, prevent abuse, understand aggregate website use, improve usability, and communicate important service information. Our interests are running a secure and useful B2B service, and we limit the data used for these purposes.</p>
        </LegalSubsection>
        <LegalSubsection title="Meet legal obligations">
          <p>We may retain tax, accounting, transaction, security, and rights-request records where the law requires it, and respond to lawful requests.</p>
        </LegalSubsection>
        <LegalSubsection title="Consent where required">
          <p>We rely on consent for optional communications or device storage where applicable. You may withdraw consent at any time without affecting earlier lawful processing.</p>
        </LegalSubsection>
        <p>When we process a customer's end-user data as a processor, we do so under that customer's instructions and data-processing agreement.</p>
      </LegalSection>

      <LegalSection title="6. Business prospect outreach">
        <p>
          We use limited business contact and company information to identify SaaS businesses that may have a genuine use for RevRecovery, verify that an approach is relevant, send personalised founder-led business outreach, manage replies and follow-ups, and avoid contacting people who have objected.
        </p>
        <p>
          Where applicable, we rely on our legitimate interests in introducing and developing our B2B service, after considering the source of the information, the professional context, the relevance of the message, the likely impact on the person, and the safeguards we use. Where consent is required by applicable electronic-marketing law, we rely on consent instead and do not send the outreach without it.
        </p>
        <p>
          Our outreach is directed to a work address that reasonably appears to be used for the person's commercial or official role, and the message relates to that role. The first message identifies the public source of the address or business context, links to this notice, and provides an easy way to object. You can object to direct marketing at any time, without charge, by replying to the message, using its unsubscribe link, or emailing <a className="font-medium text-[var(--primary-text)] underline" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>. If you object, we stop direct-marketing use of your data.
        </p>
        <p>
          HubSpot is used to store prospect records, manage the sequence, record objections, and create outreach tasks. Google Workspace is used for the connected sending inbox. These providers may also supply delivery and engagement information described above.
        </p>
      </LegalSection>

      <LegalSection title="7. Automated processing">
        <p>
          RevRecovery uses customer-configured rules and Stripe events to create recovery cases, schedule or stop messages, and flag cases that may need attention. These rules do not make legal or similarly significant decisions about individuals, and RevRecovery does not use an AI churn-prediction model to decide who receives recovery treatment. Account users control the relevant configuration and can pause recovery.
        </p>
      </LegalSection>

      <LegalSection title="8. Who receives personal data">
        <p>We disclose data only where needed to operate the service, follow customer instructions, complete a transaction, obtain professional advice, protect rights or security, or comply with law. Current provider categories include:</p>
        <LegalList>
          <li><strong>Supabase</strong> for authentication, database, and application infrastructure.</li>
          <li><strong>Vercel</strong> for application hosting and delivery.</li>
          <li><strong>Stripe</strong> for RevRecovery subscriptions, connected-account access, and payment data supplied by customers.</li>
          <li><strong>Resend</strong> for transactional and configured recovery email delivery.</li>
          <li><strong>Sentry</strong> for redacted operational error and performance monitoring.</li>
          <li><strong>Plausible Analytics</strong> for cookie-free, aggregate website analytics when enabled.</li>
          <li><strong>Botpress</strong> for the optional website assistant when enabled.</li>
          <li><strong>HubSpot</strong> for business prospect records, outreach sequences, tasks, objections, and related delivery or engagement records.</li>
          <li><strong>Google Workspace</strong> for the connected business inbox used to send and receive prospect outreach.</li>
          <li>Professional advisers, regulators, courts, law enforcement, or a buyer of the business where disclosure is lawful and necessary.</li>
        </LegalList>
        <p>More detail about service providers used for customer data appears in our <Link className="font-medium text-[var(--primary-text)] underline" href="/data-processing">Data Processing Addendum</Link>.</p>
      </LegalSection>

      <LegalSection title="9. International transfers">
        <p>
          Some providers, including HubSpot and Google Workspace, may process personal data outside Ireland or the European Economic Area through their service locations or group companies. Where required, we use an applicable adequacy decision, the European Commission's Standard Contractual Clauses, or another lawful transfer mechanism, together with appropriate safeguards. You may contact us for information about the mechanism relevant to your data.
        </p>
      </LegalSection>

      <LegalSection title="10. How long we keep data">
        <p>We retain personal data only for as long as needed for the purpose for which it was collected, taking account of the account relationship, customer instructions, security needs, dispute and audit requirements, and legal obligations.</p>
        <LegalList>
          <li>Account and service data is generally kept while the account is active and for a limited period after closure to complete deletion, resolve disputes, and meet legal obligations.</li>
          <li>Recovery records and audit evidence are kept according to the customer's instructions and the period reasonably needed to provide reporting, prevent duplicate delivery, and demonstrate what occurred.</li>
          <li>Transaction and accounting records may be retained for the period required by tax and company law.</li>
          <li>Security, webhook, delivery, and error records are kept for limited operational periods unless a longer period is needed to investigate an incident or legal claim.</li>
          <li>Business prospect records are kept while we assess relevance, conduct limited outreach, manage a response, or reasonably need the record for follow-up and compliance. We review those records and delete or minimise them when the prospect is no longer relevant or the purpose has ended.</li>
          <li>If someone objects or unsubscribes, we retain a minimal suppression record, such as the work email address and the date and scope of the objection, for as long as reasonably necessary to honour the request and demonstrate compliance. We do not use that suppression record to continue marketing.</li>
          <li>Provider backups may retain deleted data temporarily until their normal backup cycle completes.</li>
        </LegalList>
        <p>Customers may contact us to request account closure or discuss deletion and export options. We will provide more specific retention information where required for a rights request.</p>
      </LegalSection>

      <LegalSection title="11. Security">
        <p>
          We use access controls, row-level data policies, encrypted transport, encrypted Stripe connection tokens, signed webhook verification, least-privilege service access, delivery safeguards, and operational monitoring designed to protect personal data. No system is completely secure, so customers must also protect their login credentials and connected accounts.
        </p>
      </LegalSection>

      <LegalSection title="12. Your data-protection rights">
        <p>Depending on the law and context, you may have rights to access, correct, erase, restrict or object to processing, and receive portable data. You may also withdraw consent where consent is the basis used.</p>
        <p>If we use your data for direct marketing, you have an absolute right to object at any time. Once you object, we stop using your data for direct marketing and keep only the limited information needed to honour your choice.</p>
        <p>Send a request to <a className="font-medium text-[var(--primary-text)] underline" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>. We may need to verify your identity. If RevRecovery processes the data only for one of our business customers, we may refer the request to that customer and assist it.</p>
        <p>You may complain to the Irish Data Protection Commission at <a className="font-medium text-[var(--primary-text)] underline" href="https://www.dataprotection.ie/" rel="noreferrer" target="_blank">dataprotection.ie</a>, or to the supervisory authority where you live or work.</p>
      </LegalSection>

      <LegalSection title="13. Cookies and browser storage">
        <p>RevRecovery uses essential authentication and security storage, cookie-free Plausible analytics when configured, and browser storage associated with the optional website assistant. Our <Link className="font-medium text-[var(--primary-text)] underline" href="/cookies">Cookie Notice</Link> explains these technologies and your choices.</p>
      </LegalSection>

      <LegalSection title="14. Children">
        <p>RevRecovery is a business service and is not directed to children. You must be at least 18 and able to enter a business contract to create an account.</p>
      </LegalSection>

      <LegalSection title="15. Changes and contact">
        <p>We may update this notice as the service or law changes. We will post the new date and provide additional notice where a material change requires it.</p>
        <p>Contact: <a className="font-medium text-[var(--primary-text)] underline" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>, or write to {LEGAL_OPERATOR_NAME}, {LEGAL_POSTAL_ADDRESS}.</p>
      </LegalSection>
    </LegalPage>
  );
}
