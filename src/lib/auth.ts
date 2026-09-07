import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const STAFF_COOKIE = "gtg_staff_session";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getStaffPassword() {
  return process.env.STAFF_PASSWORD || "goodwill";
}

export function verifyStaffPassword(password: string) {
  return password === getStaffPassword();
}

export function createStaffSessionToken() {
  const secret = process.env.STAFF_SESSION_SECRET || getStaffPassword();
  // Edge-safe encoding for middleware
  const raw = `gtg:${secret}`;
  if (typeof btoa === "function") {
    return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }
  return raw;
}

export function isValidStaffToken(token: string | undefined | null) {
  if (!token) return false;
  return token === createStaffSessionToken();
}

export async function isStaffAuthenticated() {
  const jar = await cookies();
  return isValidStaffToken(jar.get(STAFF_COOKIE)?.value);
}

export function setStaffSessionCookie(response: NextResponse) {
  response.cookies.set(STAFF_COOKIE, createStaffSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}

export function clearStaffSessionCookie(response: NextResponse) {
  response.cookies.set(STAFF_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export function requireStaffFromRequest(request: NextRequest) {
  return isValidStaffToken(request.cookies.get(STAFF_COOKIE)?.value);
}
