import { NextResponse } from "next/server";
import { getRecoveryModeSettingsForUser } from "../../../lib/server/recovery-account-settings";
import { getControlledTestEligibility } from "../../../lib/server/activation-readiness";
import {
  createSyntheticSandboxCase,
  SyntheticTestCaseError,
} from "../../../lib/server/synthetic-test-case";
import { getUserSettings } from "../../../lib/server/settings-store";
import { createClient } from "../../../lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { confirmation?: unknown };
    const [recoverySettings, settingsRecord] = await Promise.all([
      getRecoveryModeSettingsForUser(userId),
      getUserSettings(userId),
    ]);
    const eligibility = getControlledTestEligibility({
      recoverySettings,
      userSettings: settingsRecord.settings,
    });
    const testCase = await createSyntheticSandboxCase({
      confirmation: body.confirmation,
      eligibility,
      recoverySettings,
      userId,
    });

    return NextResponse.json({ testCase }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntheticTestCaseError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create the synthetic case." },
      { status: 500 },
    );
  }
}
