import { NextResponse } from "next/server";
import { disableSendingDomainForUser, SendingDomainSettingsError } from "../../../../lib/server/recovery-sending-domains";
import { createClient } from "../../../../lib/supabase/server";

export async function POST() {
  try {
    const { data } = await (await createClient()).auth.getClaims();
    const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ sendingDomain: await disableSendingDomainForUser(userId) });
  } catch (error) {
    if (error instanceof SendingDomainSettingsError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Unable to disable the sending domain." }, { status: 500 });
  }
}
