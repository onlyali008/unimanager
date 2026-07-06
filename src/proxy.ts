import { NextRequest, NextResponse } from "next/server";

import { authEnabled, authSecret } from "@/lib/auth/config";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

/**
 * Next 16 proxy (the middleware successor, Node runtime): when auth is
 * configured, every page and API route requires a valid session cookie.
 * Without auth env vars this passes everything through unchanged.
 */
export function proxy(request: NextRequest) {
  if (!authEnabled()) return NextResponse.next();

  const { pathname } = request.nextUrl;
  const session = verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
    authSecret(),
  );

  if (pathname === "/login" || pathname.startsWith("/api/auth/")) {
    // Already signed in? Skip the login page.
    if (session && pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (session) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // Gate everything except static assets and metadata files.
  matcher: ["/((?!_next/|favicon\\.ico|icon\\.png).*)"],
};
