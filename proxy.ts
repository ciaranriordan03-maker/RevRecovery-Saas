import { NextResponse, type NextRequest } from "next/server";
import { CANCELLATION_TEST_EMAIL_WEBHOOK_PATH } from "./app/lib/cancellation-rescue/test-email-policy";
import { updateSession } from "./app/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  // This endpoint authenticates with a dedicated provider signature, not cookies.
  if (request.nextUrl.pathname === CANCELLATION_TEST_EMAIL_WEBHOOK_PATH) {
    return NextResponse.next();
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
