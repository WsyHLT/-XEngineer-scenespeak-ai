import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "scenespeak-token";

/** 与 backend SITE_ACCESS_PASSWORD 配套：生产环境设为 true */
const AUTH_REQUIRED = process.env.ACCESS_PASSWORD_REQUIRED === "true";

export function middleware(request: NextRequest) {
  if (!AUTH_REQUIRED) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (pathname === "/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
