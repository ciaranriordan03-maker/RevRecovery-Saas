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
} from "../lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service | RevRecovery",
  description: "The terms that apply when a business accesses or uses RevRecovery.",
};

export default function TermsPage() {
  return (
    <LegalPage
      description="These Terms govern access to and use of RevRecovery. RevRecovery is a business service, so you should read them on behalf of the business you represent."
      title="Terms of Service"
    >
      <LegalCallout>
        <p className="font-semibold">Important</p>
        <p className="mt-1">RevRecovery supports failed-payment recovery, but does not guarantee that any invoice, customer, or amount will be recovered. You control when recovery is enabled and remain responsible for your customer relationships and legal obligations.</p>
      </LegalCallout>

      <LegalSection title="1. Agreement and business use">
        <p>These Terms form an agreement between the person or organisation using RevRecovery ("Customer", "you") and {LEGAL_OPERATOR_NAME}, trading as RevRecovery from {LEGAL_POSTAL_ADDRESS} ("RevRecovery", "we", "us"). By creating an account, subscribing, or using the service, you accept these Terms.</p>
        <p>You may use RevRecovery only for business or professional purposes. You must be at least 18 and authorised to bind the business you represent. If you do not agree, do not use the service.</p>
      </LegalSection>

      <LegalSection title="2. What RevRecovery provides">
        <p>RevRecovery connects to supported Stripe billing data to help subscription businesses identify failed payments, organise recovery cases, configure customer emails, coordinate follow-up, and review recorded outcomes.</p>
        <LegalList>
          <li>Features may include test and live modes, recovery schedules, message templates, sender configuration, case views, pause controls, delivery evidence, reporting, and operational safeguards.</li>
          <li>Some features depend on your plan, configuration, verified sending domain, approved recipients, provider availability, and supported Stripe events or invoice types.</li>
          <li>We may improve or change the service, provided we do not materially remove paid core functionality without reasonable notice where practicable.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="3. Accounts and security">
        <p>You must provide accurate account information, keep credentials confidential, and promptly tell us about suspected unauthorised access. You are responsible for activity carried out through your account and for the access you grant to team members or connected services.</p>
        <p>We may require reasonable identity, ownership, or security checks before changing sensitive settings or assisting with account access.</p>
      </LegalSection>

      <LegalSection title="4. Stripe and other third-party services">
        <p>RevRecovery relies on third-party services including Stripe, Supabase, Resend, Vercel, and operational providers. Their separate terms and privacy notices apply to your use of their services.</p>
        <LegalList>
          <li>You authorise RevRecovery to access and process the connected Stripe information needed to provide the service.</li>
          <li>You must have authority to connect the Stripe account and to instruct RevRecovery to process its data.</li>
          <li>Stripe controls payment processing, invoice state, retries configured in Stripe, and the underlying financial transaction. RevRecovery does not control a card issuer's decision or guarantee a Stripe retry.</li>
          <li>Third-party outages, API changes, restrictions, or account decisions may affect RevRecovery. We will use reasonable efforts to make dependencies and interruptions clear.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="5. Your responsibilities">
        <p>You are responsible for how you configure and use RevRecovery, including:</p>
        <LegalList>
          <li>ensuring your customer contracts, privacy notices, email practices, and payment-recovery activity comply with applicable law;</li>
          <li>having a valid lawful basis and all necessary permissions to provide customer and payment-contact data to RevRecovery and its subprocessors;</li>
          <li>reviewing sender identity, message content, timing, audience, test results, Stripe overlap, and delivery settings before enabling live use;</li>
          <li>keeping customer-facing content accurate, fair, and not misleading, threatening, discriminatory, or unlawful;</li>
          <li>honouring suppressions, objections, unsubscribe requirements, and applicable electronic-marketing rules;</li>
          <li>monitoring unresolved cases and deciding when manual action or account access changes are appropriate; and</li>
          <li>not submitting special-category data, full card details, passwords, or data that is unnecessary for failed-payment recovery.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="6. Recovery delivery and safeguards">
        <p>New or changed configurations may require testing, domain verification, or explicit activation. A saved message or schedule does not by itself enable delivery. You are responsible for the final decision to enable live recovery where that control is available.</p>
        <p>RevRecovery may pause, suppress, quarantine, or block a message or workflow where a safety gate, duplicate check, provider response, customer state, payment update, complaint, or operational issue indicates that delivery should not proceed.</p>
        <p>Configuration changes generally apply to future recovery cases. Active cases may retain the configuration snapshot with which they started so that an in-progress sequence remains consistent.</p>
      </LegalSection>

      <LegalSection title="7. Fees, billing, and cancellation">
        <p>Prices, billing periods, included features, and any trial or founding-member terms are shown at checkout or in an applicable order. Stripe processes subscription payments.</p>
        <LegalList>
          <li>Unless an order states otherwise, fees are billed in advance and exclude taxes that you are legally responsible for paying.</li>
          <li>You authorise recurring charges for the selected billing period until cancellation.</li>
          <li>You may cancel future renewal using the method made available in the service or by contacting us. Cancellation takes effect at the end of the current paid period unless law or the order requires otherwise.</li>
          <li>Fees already paid are non-refundable except where the order states otherwise or applicable law requires a refund.</li>
          <li>We may change prices for a future renewal by giving reasonable advance notice.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="8. Customer data and privacy">
        <p>You retain your rights in data you submit or make available through a connected service ("Customer Data"). You grant RevRecovery the limited right to host, copy, transmit, transform, and otherwise process Customer Data only as needed to provide, secure, support, and improve the service, comply with law, and follow your documented instructions.</p>
        <p>Our <Link className="font-medium text-[var(--primary-text)] underline" href="/privacy">Privacy Notice</Link> explains how we handle data as a controller. Our <Link className="font-medium text-[var(--primary-text)] underline" href="/data-processing">Data Processing Addendum</Link> applies where RevRecovery processes personal data for you as a processor.</p>
        <p>You are responsible for providing legally required information to your customers and responding to their rights requests. We will provide reasonable assistance for data we process on your behalf.</p>
      </LegalSection>

      <LegalSection title="9. Acceptable use">
        <p>You must not, and must not help anyone else to:</p>
        <LegalList>
          <li>use RevRecovery for unlawful, fraudulent, abusive, deceptive, or discriminatory activity;</li>
          <li>send spam, phishing, malware, or communications unrelated to a legitimate customer payment relationship;</li>
          <li>access data or accounts without authorisation, bypass security or delivery controls, or interfere with the service;</li>
          <li>probe, scan, overload, reverse engineer, copy, resell, or create a competing service from RevRecovery except where law expressly permits;</li>
          <li>upload malicious code or use automated access outside documented interfaces; or</li>
          <li>use the service to make solely automated decisions that produce legal or similarly significant effects on an individual.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="10. Intellectual property and feedback">
        <p>RevRecovery and its licensors own the service, software, visual design, documentation, and related intellectual property. Subject to these Terms and payment of applicable fees, we grant you a limited, non-exclusive, non-transferable right to use the service during your subscription.</p>
        <p>You retain ownership of your content and message templates. If you provide feedback, you allow us to use it without restriction or payment, provided we do not identify you publicly without permission.</p>
      </LegalSection>

      <LegalSection title="11. Confidentiality">
        <p>Each party may receive non-public information that a reasonable person would understand to be confidential. The receiving party will use it only for the agreement, protect it with reasonable care, and disclose it only to people who need it and are bound by appropriate duties. This does not cover information that is public without breach, already lawfully known, independently developed, or lawfully received from another source.</p>
      </LegalSection>

      <LegalSection title="12. Availability, support, and beta features">
        <p>We aim to provide a reliable service but do not promise uninterrupted or error-free availability. Maintenance, security work, third-party incidents, and events beyond reasonable control may cause interruptions.</p>
        <p>Features labelled test, preview, beta, experimental, or read-only may change, be incomplete, or have additional limits. Do not rely on them for a critical decision without independently checking the underlying data.</p>
      </LegalSection>

      <LegalSection title="13. Reporting and recovery limitations">
        <LegalSubsection title="No guarantee of recovery">
          <p>Payment recovery depends on the customer, card issuer, Stripe configuration, payment method, product access, timing, and other factors outside RevRecovery's control. We do not guarantee a recovery rate, revenue result, customer retention outcome, or return on investment.</p>
        </LegalSubsection>
        <LegalSubsection title="Observed outcomes are not proof of causation">
          <p>RevRecovery can record that a message, click, retry, payment, or case update occurred. A payment occurring after a message does not prove that the message caused the payment. Amounts at risk or represented by cases are not automatically confirmed collected revenue.</p>
        </LegalSubsection>
        <LegalSubsection title="Not professional advice">
          <p>The service and its guidance are operational tools, not legal, tax, accounting, financial, credit, or debt-collection advice. You remain responsible for professional advice and business decisions.</p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection title="14. Suspension and termination">
        <p>You may stop using the service and cancel renewal at any time. We may suspend or terminate access where reasonably necessary for non-payment, security, legal compliance, material breach, harm to customers or providers, or misuse of the service. Where practicable, we will give notice and an opportunity to fix a remediable issue.</p>
        <p>On termination, your right to use the service ends. Provisions that by their nature should continue—including payment obligations, confidentiality, intellectual property, disclaimers, liability, and dispute terms—will survive. Customer Data will be handled under the Privacy Notice and Data Processing Addendum.</p>
      </LegalSection>

      <LegalSection title="15. Warranties and liability">
        <p>To the extent permitted by law, RevRecovery is provided "as is" and "as available". We exclude implied warranties that may lawfully be excluded, including fitness for a particular purpose and non-infringement.</p>
        <p>To the extent permitted by law, neither party is liable for indirect, incidental, special, punitive, or consequential loss, or for lost profits, revenue, goodwill, or data, arising from these Terms—even if the possibility was known.</p>
        <p>To the extent permitted by law, RevRecovery's total liability arising from the service or these Terms will not exceed the fees you paid for RevRecovery in the 12 months before the event giving rise to the claim.</p>
        <p>Nothing in these Terms excludes or limits liability that cannot legally be excluded or limited, including liability for fraud, fraudulent misrepresentation, or death or personal injury caused by negligence.</p>
      </LegalSection>

      <LegalSection title="16. Governing law and disputes">
        <p>These Terms and non-contractual disputes relating to them are governed by Irish law. The courts of Ireland have exclusive jurisdiction, except where mandatory law requires otherwise.</p>
        <p>Before starting formal proceedings, please contact us so the parties can try in good faith to resolve the issue.</p>
      </LegalSection>

      <LegalSection title="17. General terms">
        <LegalList>
          <li>You may not assign these Terms without our written consent, except as part of a genuine sale of substantially all relevant business assets. We may assign them as part of a reorganisation, financing, or sale of the service.</li>
          <li>If a provision is unenforceable, it will be adjusted only as much as necessary and the rest remains effective.</li>
          <li>A delay in enforcing a right is not a waiver.</li>
          <li>These Terms, an applicable order, the Data Processing Addendum, and policies incorporated by reference form the entire agreement about the service.</li>
          <li>Electronic notices may be sent to the account email or displayed in the service.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="18. Changes and contact">
        <p>We may update these Terms. For material changes, we will provide reasonable notice where practicable. Continued use after the effective date means you accept the updated Terms; if you do not accept them, you must stop using the service before they take effect.</p>
        <p>Questions: <a className="font-medium text-[var(--primary-text)] underline" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>, or write to {LEGAL_OPERATOR_NAME}, {LEGAL_POSTAL_ADDRESS}.</p>
      </LegalSection>
    </LegalPage>
  );
}
