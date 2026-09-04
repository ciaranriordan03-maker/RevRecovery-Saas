import { NextResponse } from "next/server";
import { refreshSendingDomainForUser, SendingDomainSettingsError } from "../../../../lib/server/recovery-sending-domains";
import { createClient } from "../../../../lib/supabase/server";

export async function POST() {
  try {
    const { data } = await (await createClient()).auth.getClaims();
    const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ sendingDomain: await refreshSendingDomainForUser(userId) });
  } catch (error) {
    if (error instanceof SendingDomainSettingsError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Unable to refresh domain status." }, { status: 500 });
  }
}
