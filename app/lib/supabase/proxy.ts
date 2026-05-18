import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublishableKey, getSupabaseUrl } from "./env";

const protectedPaths = ["/dashboard", "/onboarding"];
const publicAuthPaths = ["/login", "/signup"];

function isProtectedPath(pathname: string) {
  return protectedPaths.some((path) => pathname.startsWith(path));
}

function isPublicAuthPath(pathname: string) {
  return publicAuthPaths.some((path) => pathname.startsWith(path));
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });
  const supabaseUrl = getSupabaseUrl();
  const supabasePublishableKey = getSupabasePublishableKey();

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("Supabase URL and publishable key are required.");
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, options, value }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims && isProtectedPath(request.nextUrl.pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (claims && isPublicAuthPath(request.nextUrl.pathname)) {
    const appUrl = request.nextUrl.clone();
    appUrl.pathname = "/onboarding";
    appUrl.searchParams.delete("next");
    return NextResponse.redirect(appUrl);
  }

  return response;
}
