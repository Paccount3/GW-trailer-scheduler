import type { Metadata } from "next";
import { Suspense } from "react";
import { data } from "@/lib/data";
import { ManageDonationsClient } from "@/components/ManageDonationsClient";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Manage Donations",
};

export const dynamic = "force-dynamic";

export default async function ManageDonationsPage() {
  const [donations, trailers, reports, loadSettings] = await Promise.all([
    data.listDonations(),
    data.listTrailers(),
    data.listReports(),
    data.listLoadSettings(),
  ]);
  const pickupReports = Object.fromEntries(
    reports
      .filter((report) => report.report_type === "pickup")
      .map((report) => {
        const extras = report.extras as {
          estimated_load?: string;
          estimated_load_other?: string;
        } | null;
        return [
          report.donation_request_id,
          {
            id: report.id,
            completed: report.is_completed,
            estimatedLoad: extras?.estimated_load || null,
            estimatedLoadOther: extras?.estimated_load_other || null,
          },
        ];
      }),
  );

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-ink">
            Manage Donations
          </h1>
          <p className="text-muted mt-1">
            All trailer requests at a glance — update status, assign trailers, and
            set load estimates.
          </p>
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Data source: {isSupabaseConfigured() ? "Supabase" : "Demo store"}
        </p>
      </div>

      <Suspense fallback={<div className="panel p-8 text-muted">Loading…</div>}>
        <ManageDonationsClient
          initialDonations={donations}
          trailers={trailers}
          pickupReports={pickupReports}
          loadSettings={loadSettings}
        />
      </Suspense>
    </div>
  );
}
