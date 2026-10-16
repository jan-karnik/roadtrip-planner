import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sessionSecret, verifySessionValue } from "@/lib/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/login") {
    return NextResponse.next();
  }

  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySessionValue(session, sessionSecret())) {
    return NextResponse.next();
  }

  // Build the redirect from the forwarded host/proto so it points at the public
  // hostname rather than the internal bind address: behind a reverse proxy,
  // `request.url`'s host is often localhost, which a browser can't follow.
  // Fall back to request.url when not proxied.
  const forwardedHost =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const forwardedProto =
    request.headers.get("x-forwarded-proto") ??
    request.nextUrl.protocol.replace(":", "");
  const base = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : request.url;
  return NextResponse.redirect(new URL("/login", base));
}

export const config = {
  // Exclude static files and Next.js internals; protect everything else.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
