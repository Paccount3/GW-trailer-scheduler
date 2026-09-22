import type { Metadata } from "next";
import { data } from "@/lib/data";
import { TrailerReportsClient } from "@/components/TrailerReportsClient";

export const metadata: Metadata = {
  title: "Trailer Reports",
};

export const dynamic = "force-dynamic";

export default async function TrailerReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ donation?: string }>;
}) {
  const params = await searchParams;
  const [reports, donations, loadSettings] = await Promise.all([
    data.listReports(),
    data.listDonations(),
    data.listLoadSettings(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-ink">
          Trailer Reports
        </h1>
        <p className="text-muted mt-1">
          Search for a work order, complete the onsite pickup inspection, or
          return to a saved draft.
        </p>
      </div>

      <TrailerReportsClient
        initialReports={reports}
        donations={donations}
        loadSettings={loadSettings}
        initialDonationId={params.donation}
      />
    </div>
  );
}
