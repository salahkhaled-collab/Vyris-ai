import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(request) {
    if (request.nextUrl.pathname === "/") {
      return NextResponse.redirect(new URL("/strategy", request.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

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