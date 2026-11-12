import "server-only";

import {
  buildSignupUrl,
  buildWelcomeEmail,
  DEFAULT_CUSTOMER_SETUP_URL,
} from "../billing/welcome-email";

function getRequiredEnvironmentValue(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

export function getCustomerAppUrl() {
  return getRequiredEnvironmentValue("CUSTOMER_APP_URL");
}

export function getCustomerSetupUrl() {
  return process.env.CUSTOMER_SETUP_URL?.trim() || DEFAULT_CUSTOMER_SETUP_URL;
}

export async function sendFoundingMemberWelcome({
  customerEmail,
  customerName,
  checkoutSessionId,
}: {
  customerEmail: string;
  customerName: string | null;
  checkoutSessionId: string;
}) {
  const apiKey = getRequiredEnvironmentValue("RESEND_API_KEY");
  const from = getRequiredEnvironmentValue("WELCOME_EMAIL_FROM");
  const signupUrl = buildSignupUrl(getCustomerAppUrl(), customerEmail);
  const setupUrl = getCustomerSetupUrl();
  const email = buildWelcomeEmail({ customerName, setupUrl, signupUrl });
  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from,
      html: email.html,
      reply_to: "ciaran@revrecovery.io",
      subject: email.subject,
      text: email.text,
      to: [customerEmail],
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `founding-member-welcome/${checkoutSessionId}`,
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Resend welcome email failed with HTTP ${response.status}.`);
  }
}
