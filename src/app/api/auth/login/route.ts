import { NextRequest, NextResponse } from "next/server";
import {
  setStaffSessionCookie,
  verifyStaffPassword,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const password = String(body.password || "");

  if (!verifyStaffPassword(password)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  return setStaffSessionCookie(response);
}
