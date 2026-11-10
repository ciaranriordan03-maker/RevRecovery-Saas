import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";
import { evaluateOnboardingReadiness } from "../../../lib/onboarding/readiness";
import { getEmailSettingsValidationError } from "../../../lib/settings";
import { markUserOnboardingCompleted } from "../../../lib/server/onboarding-store";
import { getRecoveryModeSettingsForUser } from "../../../lib/server/recovery-account-settings";
import { getUserSettings } from "../../../lib/server/settings-store";

export async function POST() {
  const claims = await requireUser();
  const [recoverySettings, userSettingsRecord] = await Promise.all([
    getRecoveryModeSettingsForUser(claims.sub),
    getUserSettings(claims.sub),
  ]);
  const readiness = evaluateOnboardingReadiness({
    emailIdentityConfigured:
      getEmailSettingsValidationError(userSettingsRecord.settings.email) === null,
    stripeConnected: recoverySettings.connected,
  });

  if (!readiness.ready) {
    const blockers = readiness.checks.filter((check) => !check.complete);

    return NextResponse.json(
      {
        blockers,
        error:
          blockers.length === 1
            ? blockers[0].detail
            : "Connect Stripe and save your customer email identity before finishing setup.",
      },
      { status: 409 },
    );
  }

  const profile = await markUserOnboardingCompleted(claims.sub);

  return NextResponse.json({ profile, readiness });
}
