import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// DEV MODE: Auth is bypassed so all pages are accessible without signing in.
// To restore auth protection, replace this file with the withAuth version.
export function middleware(request: NextRequest) {
  // Redirect root to dashboard
  if (request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/decisions/:path*",
    "/automation/:path*",
    "/inbox/:path*",
    "/team/:path*",
    "/projects/:path*",
    "/meetings/:path*",
    "/comms/:path*",
    "/calendar/:path*",
    "/contacts/:path*",
    "/documents/:path*",
    "/strategy/:path*",
    "/biz-dev/:path*",
    "/brand/:path*",
    "/onboarding/:path*",
    "/",
  ],
};
