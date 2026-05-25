import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

const PUBLIC_ADMIN_PATHS = new Set(["/admin/login"]);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Forward pathname to server components (which can't read it directly).
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  const pass = NextResponse.next({ request: { headers: requestHeaders } });

  if (!pathname.startsWith("/admin")) return pass;
  if (PUBLIC_ADMIN_PATHS.has(pathname)) return pass;
  if (req.auth) return pass;

  const loginUrl = new URL("/admin/login", req.nextUrl.origin);
  if (pathname !== "/admin") {
    loginUrl.searchParams.set("callbackUrl", pathname);
  }
  return NextResponse.redirect(loginUrl);
});

export const config = {
  matcher: ["/admin/:path*"],
};
