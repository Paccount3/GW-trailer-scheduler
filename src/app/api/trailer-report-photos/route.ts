import { NextRequest, NextResponse } from "next/server";
import { requireStaffFromRequest } from "@/lib/auth";
import { saveDemoUpload } from "@/lib/demo-files";
import {
  getServiceSupabase,
  isSupabaseConfigured,
  requireSupabaseInProduction,
} from "@/lib/supabase/server";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function safeExtension(file: File) {
  const byType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return byType[file.type] || "jpg";
}

function sanitizeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "field";
}

export async function POST(request: NextRequest) {
  if (!requireStaffFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const donationId = String(form.get("donation_id") || "").trim();
    const fieldKey = String(form.get("field_key") || "photo").trim();
    const photo = form.get("photo");

    if (!donationId) {
      return NextResponse.json(
        { error: "donation_id is required" },
        { status: 400 },
      );
    }
    if (!(photo instanceof File) || photo.size === 0) {
      return NextResponse.json(
        { error: "A photo file is required" },
        { status: 400 },
      );
    }
    if (!IMAGE_TYPES.has(photo.type)) {
      return NextResponse.json(
        { error: "Photo must be a JPG, PNG, or WebP image." },
        { status: 400 },
      );
    }
    if (photo.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Photo must be smaller than 8 MB." },
        { status: 400 },
      );
    }

    const path = `trailer-reports/${sanitizeSegment(donationId)}/${sanitizeSegment(fieldKey)}/${crypto.randomUUID()}.${safeExtension(photo)}`;
    const bytes = await photo.arrayBuffer();

    if (!isSupabaseConfigured()) {
      requireSupabaseInProduction();
      await saveDemoUpload(path, bytes, photo.type);
      return NextResponse.json({ path }, { status: 201 });
    }

    const { error } = await getServiceSupabase().storage
      .from("request-documents")
      .upload(path, bytes, {
        contentType: photo.type,
        upsert: false,
      });
    if (error) throw error;

    return NextResponse.json({ path }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to upload photo.",
      },
      { status: 400 },
    );
  }
}
