import { NextRequest, NextResponse } from "next/server";
import { clearStaffSessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/staff/login", request.url), 303);
  return clearStaffSessionCookie(response);
}
