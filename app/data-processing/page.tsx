/* eslint-disable max-lines, react/no-unescaped-entities -- This route is intentionally long-form legal prose. */
import type { Metadata } from "next";
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
  title: "Data Processing Addendum | RevRecovery",
  description: "The data-processing terms that apply when RevRecovery processes personal data for a business customer.",
};

export default function DataProcessingPage() {
  return (
    <LegalPage
      description="This Data Processing Addendum applies when RevRecovery processes personal data on behalf of a business customer under the Terms of Service or another written agreement."
      title="Data Processing Addendum"
    >
      <LegalCallout>
        <p className="font-semibold">How this addendum applies</p>
        <p className="mt-1">The Customer is the controller and RevRecovery is the processor for customer and payment-contact data supplied through the connected service. This addendum forms part of the agreement and is intended to meet Article 28 GDPR requirements.</p>
      </LegalCallout>

      <LegalSection title="1. Definitions and priority">
        <p>For this addendum, RevRecovery is operated by {LEGAL_OPERATOR_NAME} from {LEGAL_POSTAL_ADDRESS}.</p>
        <p>"Customer", "Customer Data", "RevRecovery", and "Services" have the meanings given in the Terms of Service. "Controller", "processor", "personal data", "processing", "data subject", "personal data breach", and "supervisory authority" have the meanings in applicable data-protection law.</p>
        <p>If this addendum conflicts with the agreement on the processing of personal data, this addendum controls. The European Commission's Standard Contractual Clauses ("SCCs"), where applicable, control over conflicting commercial terms.</p>
      </LegalSection>

      <LegalSection title="2. Roles and instructions">
        <p>The Customer is the controller and RevRecovery is the processor for personal data processed to provide the Services. Each party will comply with the data-protection law that applies to it.</p>
        <p>RevRecovery will process personal data only on the Customer's documented instructions, including this addendum, the agreement, service configuration, and authorised support requests, unless law requires otherwise. If legally permitted, we will inform the Customer before required processing.</p>
        <p>RevRecovery will promptly inform the Customer if, in our reasonable opinion, an instruction infringes applicable data-protection law. We may suspend the affected processing while the parties resolve the issue.</p>
      </LegalSection>

      <LegalSection title="3. Details of processing">
        <LegalSubsection title="Subject matter and purpose">
          <p>Providing failed-payment recovery software: receiving supported Stripe data, creating and updating recovery cases, applying Customer-configured schedules and messages, sending authorised emails, recording provider events, presenting operational reporting, preventing duplicate delivery, and supporting or securing the Services.</p>
        </LegalSubsection>
        <LegalSubsection title="Duration">
          <p>For the term of the agreement and the limited period needed to return or delete data, complete backups, comply with law, and resolve documented security or legal matters.</p>
        </LegalSubsection>
        <LegalSubsection title="Nature of processing">
          <p>Collection, retrieval, hosting, organisation, analysis, transmission, display, reconciliation, restriction, suppression, deletion, and other processing necessary to provide the Services.</p>
        </LegalSubsection>
        <LegalSubsection title="Categories of data subjects">
          <LegalList>
            <li>Customer personnel and authorised account users.</li>
            <li>The Customer's current or former customers, subscribers, billing contacts, and payment contacts.</li>
            <li>People who communicate with the Customer or RevRecovery about a recovery case.</li>
          </LegalList>
        </LegalSubsection>
        <LegalSubsection title="Types of personal data">
          <LegalList>
            <li>Identity and contact data, principally names, business details, and email addresses.</li>
            <li>Stripe customer, subscription, product, price, invoice, payment-attempt, amount, currency, failure, and recovery identifiers and statuses.</li>
            <li>Recovery configuration, message content, schedule, delivery events, engagement events, suppressions, case history, and audit evidence.</li>
            <li>Account, authentication, support, device, security, and operational log data.</li>
          </LegalList>
        </LegalSubsection>
        <LegalSubsection title="Special categories and payment-card data">
          <p>The Services are not designed for special-category personal data, criminal-offence data, full payment-card numbers, card security codes, or passwords. The Customer will not intentionally submit those data types.</p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection title="4. Confidentiality and personnel">
        <p>RevRecovery will ensure that people authorised to process Customer personal data are subject to appropriate confidentiality duties and receive access only where needed for their responsibilities.</p>
      </LegalSection>

      <LegalSection title="5. Security measures">
        <p>Taking account of the nature and risks of the processing, RevRecovery will maintain appropriate technical and organisational measures designed to protect personal data. Current measures include:</p>
        <LegalList>
          <li>encrypted transport and encryption of stored Stripe connection tokens;</li>
          <li>authentication, role-based access, row-level database policies, and restricted administrative credentials;</li>
          <li>signed webhook verification, idempotency controls, delivery gates, duplicate suppression, and fail-closed behaviour;</li>
          <li>environment separation, audit records, operational monitoring, and redaction of unnecessary personal data from error context;</li>
          <li>backups and provider resilience measures appropriate to the hosted service; and</li>
          <li>security review, dependency updates, and incident-response procedures.</li>
        </LegalList>
        <p>Security measures may evolve as technology and risk change, provided the overall level of protection is not materially reduced.</p>
      </LegalSection>

      <LegalSection title="6. Subprocessors">
        <p>The Customer gives general written authorisation for RevRecovery to appoint subprocessors needed to provide the Services. Current subprocessors and service categories include:</p>
        <LegalList>
          <li><strong>Supabase</strong> — authentication, hosted database, and backend infrastructure.</li>
          <li><strong>Vercel</strong> — application hosting, server execution, and content delivery.</li>
          <li><strong>Stripe</strong> — subscription billing and connected-account/payment infrastructure.</li>
          <li><strong>Resend</strong> — email transmission, sending-domain management, and delivery events.</li>
          <li><strong>Sentry</strong> — operational error and performance monitoring with personal-data minimisation.</li>
          <li><strong>Botpress</strong> — optional website-assistant conversations and related technical data when enabled.</li>
          <li><strong>Plausible Analytics</strong> — aggregate, cookie-free website analytics; not used for Customer recovery records.</li>
        </LegalList>
        <p>RevRecovery will impose data-protection obligations on subprocessors that are no less protective than required by applicable law for the relevant processing.</p>
        <p>We may update this list as providers change. Where the law requires prior notice, we will give reasonable notice through the service, account email, or this page. A Customer with a reasonable data-protection objection should contact us promptly. The parties will work in good faith on a commercially reasonable solution; if none is available, the Customer may stop the affected service.</p>
      </LegalSection>

      <LegalSection title="7. International transfers">
        <p>Where personal data is transferred from the EEA, United Kingdom, or Switzerland to a country without an applicable adequacy decision, the parties will use the relevant SCCs or another valid transfer mechanism.</p>
        <p>For an EEA restricted transfer, the controller-to-processor modules of the SCCs are incorporated by reference. The optional clauses apply as follows: docking clause enabled; general written authorisation for subprocessors; Irish Data Protection Commission as the competent supervisory authority where applicable; Irish law; and Irish courts. Annex I is completed by the agreement and section 3 of this addendum; Annex II is completed by section 5; Annex III is completed by section 6.</p>
        <p>RevRecovery will implement supplementary safeguards where required by the transfer risk and will provide available information reasonably needed for the Customer's transfer assessment.</p>
      </LegalSection>

      <LegalSection title="8. Data-subject requests">
        <p>Taking account of the nature of processing, RevRecovery will provide reasonable assistance for the Customer to respond to requests to exercise data-protection rights. If we receive a request relating to Customer-controlled data, we will refer it to the Customer unless law prevents us from doing so. The Customer remains responsible for the response.</p>
      </LegalSection>

      <LegalSection title="9. Security incidents">
        <p>RevRecovery will notify the Customer without undue delay after becoming aware of a personal data breach affecting Customer personal data. The notice will include information reasonably available about the nature of the incident, likely consequences, measures taken or proposed, and a contact point. RevRecovery will take reasonable steps to contain, investigate, and mitigate the incident.</p>
        <p>Notification does not constitute an admission of fault or liability. The Customer is responsible for determining whether to notify a supervisory authority or data subjects.</p>
      </LegalSection>

      <LegalSection title="10. Impact assessments and regulatory enquiries">
        <p>RevRecovery will provide reasonable information and assistance needed for a Customer's data-protection impact assessment or prior consultation, taking account of the processing and information available to us. Additional work beyond standard service documentation may be subject to reasonable fees agreed in advance.</p>
      </LegalSection>

      <LegalSection title="11. Information and audits">
        <p>RevRecovery will make available information reasonably necessary to demonstrate compliance with this addendum. Where that information is insufficient, the Customer may request an audit no more than once per year, unless a regulator or material incident reasonably requires more.</p>
        <p>Audits must protect other customers, security, confidentiality, and service availability; use an independent qualified auditor; occur on reasonable notice; and avoid access to another customer's data. The Customer bears its audit costs unless the audit identifies a material breach by RevRecovery.</p>
      </LegalSection>

      <LegalSection title="12. Return and deletion">
        <p>On termination or a valid written request, RevRecovery will delete or return Customer personal data, at the Customer's choice where technically available, unless law requires retention. Deletion from backups may occur through the normal backup lifecycle, during which the data remains protected and is not used for another purpose.</p>
      </LegalSection>

      <LegalSection title="13. Customer obligations">
        <p>The Customer warrants that its instructions and provision of personal data comply with law, and that it has given required notices and established a valid lawful basis. The Customer is responsible for data accuracy, minimisation, retention decisions, message content, recipient eligibility, and responding to data subjects.</p>
      </LegalSection>

      <LegalSection title="14. Liability and governing terms">
        <p>The liability limits and governing-law provisions in the Terms of Service or applicable order apply to this addendum, subject to any limits that data-protection law does not permit the parties to exclude.</p>
      </LegalSection>

      <LegalSection title="15. Contact">
        <p>Data-processing questions and requests should be sent to <a className="font-medium text-[var(--primary-text)] underline" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>, or by post to {LEGAL_OPERATOR_NAME}, {LEGAL_POSTAL_ADDRESS}.</p>
      </LegalSection>
    </LegalPage>
  );
}
