import type { Metadata } from "next";
import { data } from "@/lib/data";
import { ReportsCharts } from "@/components/ReportsCharts";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Reports",
};

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const browserDemo = !isSupabaseConfigured();
  const [donations, reports, loadSettings] = await Promise.all([
    data.listDonations(),
    data.listReports(),
    data.listLoadSettings(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-ink">Reports</h1>
        <p className="text-muted mt-1">
          Track demand, community reach, estimated donation impact, and
          operational follow-up.
        </p>
      </div>

      <ReportsCharts
        donations={browserDemo ? [] : donations}
        reports={browserDemo ? [] : reports}
        loadSettings={loadSettings}
        browserDemo={browserDemo}
      />
    </div>
  );
}
