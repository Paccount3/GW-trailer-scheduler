import { NextRequest, NextResponse } from "next/server";
import { isValidStaffToken, STAFF_COOKIE } from "@/lib/auth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/staff") && pathname !== "/staff/login") {
    const token = request.cookies.get(STAFF_COOKIE)?.value;
    if (!isValidStaffToken(token)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/staff/login";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname === "/staff/login") {
    const token = request.cookies.get(STAFF_COOKIE)?.value;
    if (isValidStaffToken(token)) {
      const dest = request.nextUrl.clone();
      dest.pathname = "/staff/manage";
      dest.search = "";
      return NextResponse.redirect(dest);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/staff/:path*"],
};
