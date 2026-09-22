import { NextRequest, NextResponse } from "next/server";
import { requireStaffFromRequest } from "@/lib/auth";
import { readDemoUpload } from "@/lib/demo-files";
import {
  getServiceSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  if (!requireStaffFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const path = request.nextUrl.searchParams.get("path");
  if (!path || path.includes("..")) {
    return NextResponse.json({ error: "Invalid document path" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    const file = readDemoUpload(path);
    if (!file) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    return new NextResponse(new Uint8Array(file.buffer), {
      headers: {
        "Content-Type": file.contentType,
        "Cache-Control": "private, max-age=60",
      },
    });
  }

  const { data, error } = await getServiceSupabase().storage
    .from("request-documents")
    .createSignedUrl(path, 60);
  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: error?.message || "Document not found" },
      { status: 404 },
    );
  }

  return NextResponse.redirect(data.signedUrl);
}
