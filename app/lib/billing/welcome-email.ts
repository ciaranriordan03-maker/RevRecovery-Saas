export const DEFAULT_CUSTOMER_SETUP_URL =
  "https://calendly.com/ciaran-revrecovery/customer-setup";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function buildSignupUrl(appUrl: string, email: string) {
  const url = new URL("/signup", appUrl);
  url.searchParams.set("email", email);
  url.searchParams.set("next", "/onboarding");
  return url.toString();
}

export function buildWelcomeEmail({
  customerName,
  setupUrl,
  signupUrl,
}: {
  customerName: string | null;
  setupUrl: string;
  signupUrl: string;
}) {
  const firstName = customerName?.trim().split(/\s+/)[0] || null;
  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";
  const safeGreeting = escapeHtml(greeting);
  const safeSetupUrl = escapeHtml(setupUrl);
  const safeSignupUrl = escapeHtml(signupUrl);

  return {
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:rgb(17,24,39);line-height:1.6">
        <p>${safeGreeting}</p>
        <h1 style="font-size:26px;line-height:1.25">Welcome to RevRecovery</h1>
        <p>Thank you for joining as a founding member. Your subscription is confirmed.</p>
        <p>Your next step is to create your RevRecovery account. After that, the onboarding flow will help you connect Stripe in Test mode before anything is activated.</p>
        <p style="margin:28px 0"><a href="${safeSignupUrl}" style="background:rgb(79,70,229);color:white;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">Create your RevRecovery account</a></p>
        <h2 style="font-size:20px">Book your guided setup</h2>
        <p>You can also book a 45-minute setup call with Ciarán. We’ll connect your Stripe account in Test mode, review your sending identity and recovery sequence, and run a controlled test together.</p>
        <p style="margin:28px 0"><a href="${safeSetupUrl}" style="border:1px solid rgb(79,70,229);color:rgb(67,56,202);text-decoration:none;padding:11px 17px;border-radius:8px;font-weight:700">Book your customer setup call</a></p>
        <p>Nothing is switched on for live customers automatically. We’ll make sure the setup is correct before activation.</p>
        <p>If you need help, reply to this email.</p>
        <p>— Ciarán<br>RevRecovery</p>
      </div>
    `.trim(),
    subject: "Welcome to RevRecovery — let’s get you set up",
    text: `${greeting}\n\nWelcome to RevRecovery. Thank you for joining as a founding member. Your subscription is confirmed.\n\nCreate your account: ${signupUrl}\n\nBook your 45-minute guided setup call with Ciarán: ${setupUrl}\n\nNothing is switched on for live customers automatically. We’ll make sure the setup is correct before activation.\n\n— Ciarán\nRevRecovery`,
  };
}
