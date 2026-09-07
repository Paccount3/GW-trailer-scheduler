import type { Metadata } from "next";
import { data } from "@/lib/data";
import { SettingsClient } from "@/components/SettingsClient";

export const metadata: Metadata = {
  title: "Settings",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [trailers, loadSettings, donations] = await Promise.all([
    data.listTrailers(),
    data.listLoadSettings(),
    data.listDonations(),
  ]);

  const trailerStatus = trailers.map((t) => {
    const active = donations.find(
      (d) =>
        d.trailer_id === t.id &&
        ["scheduled", "trailer_on_site", "ready_for_pickup"].includes(d.status),
    );
    return {
      trailerId: t.id,
      assignment: active
        ? {
            reference_code: active.reference_code,
            status: active.status,
            name: `${active.first_name} ${active.last_name}`,
          }
        : null,
    };
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-ink">Settings</h1>
        <p className="text-muted mt-1">
          Manage available trailers and load-value estimate variables.
        </p>
      </div>

      <SettingsClient
        initialTrailers={trailers}
        initialLoadSettings={loadSettings}
        trailerStatus={trailerStatus}
      />
    </div>
  );
}
