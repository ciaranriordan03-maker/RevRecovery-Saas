import { NextResponse } from "next/server";
import { getSendingDomainForUser, registerSendingDomainForUser, SendingDomainSettingsError } from "../../../lib/server/recovery-sending-domains";
import { createClient } from "../../../lib/supabase/server";

async function userId() {
  const { data } = await (await createClient()).auth.getClaims();
  return typeof data?.claims?.sub === "string" ? data.claims.sub : null;
}
function failure(error: unknown) {
  if (error instanceof SendingDomainSettingsError) return NextResponse.json({ error: error.message }, { status: error.status });
  return NextResponse.json({ error: "Unable to manage the sending domain." }, { status: 500 });
}

export async function GET() {
  try {
    const authenticatedUserId = await userId();
    if (!authenticatedUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ sendingDomain: await getSendingDomainForUser(authenticatedUserId) });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    const authenticatedUserId = await userId();
    if (!authenticatedUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json() as { domain?: unknown };
    return NextResponse.json({ sendingDomain: await registerSendingDomainForUser(authenticatedUserId, body.domain) }, { status: 201 });
  } catch (error) { return failure(error); }
}
