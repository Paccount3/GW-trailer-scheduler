import { NextResponse } from "next/server";
import {
  getServiceSupabase,
  getSupabaseConfigStatus,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Public diagnostic for Supabase wiring (no secret values returned).
 * Open /api/health/supabase after deploy to confirm the app is not on demo fallback.
 */
export async function GET() {
  const status = getSupabaseConfigStatus();

  if (!status.configured) {
    return NextResponse.json(
      {
        ok: false,
        storage: "demo_fallback",
        ...status,
        next_steps: [
          "In Vercel → Environment Variables, set SUPABASE_SECRET_KEY to the Secret key (sb_secret_…), not the publishable key.",
          "Keep NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as Config.",
          "Redeploy after saving env vars.",
          "Run supabase/schema.sql in the Supabase SQL Editor if tables are missing.",
        ],
      },
      { status: 503 },
    );
  }

  try {
    const supabase = getServiceSupabase();
    const { count, error: tableError } = await supabase
      .from("donation_requests")
      .select("id", { count: "exact", head: true });

    if (tableError) {
      return NextResponse.json(
        {
          ok: false,
          storage: "supabase",
          configured: true,
          table_reachable: false,
          error: tableError.message,
          next_steps: [
            "Open Supabase → SQL Editor and run the contents of supabase/schema.sql.",
            "Confirm the donation_requests table exists under Table Editor.",
          ],
        },
        { status: 503 },
      );
    }

    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    const hasDocsBucket = Boolean(
      buckets?.some((bucket) => bucket.id === "request-documents"),
    );

    return NextResponse.json({
      ok: true,
      storage: "supabase",
      configured: true,
      table_reachable: true,
      donation_request_count: count ?? 0,
      request_documents_bucket: hasDocsBucket,
      bucket_error: bucketError?.message ?? null,
      next_steps: hasDocsBucket
        ? ["Supabase is connected. New form submissions should appear in donation_requests."]
        : [
            "Tables are reachable, but the request-documents storage bucket is missing.",
            "Re-run the storage.buckets insert at the bottom of supabase/schema.sql.",
          ],
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        storage: "supabase",
        configured: isSupabaseConfigured(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 },
    );
  }
}
