import type { Metadata } from "next";
import { data } from "@/lib/data";
import { ReportsCharts } from "@/components/ReportsCharts";
import { STATUS_LABELS } from "@/lib/types";
import { formatCurrency, formatNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Reports",
};

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [donations, reports] = await Promise.all([
    data.listDonations(),
    data.listReports(),
  ]);

  const byStatus = Object.entries(
    donations.reduce<Record<string, number>>((acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      return acc;
    }, {}),
  ).map(([status, count]) => ({
    status: STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status,
    count,
  }));

  const completed = donations.filter((d) => d.status === "completed");
  const totalValue = completed.reduce(
    (sum, d) => sum + (Number(d.estimated_value) || 0),
    0,
  );
  const totalPounds = completed.reduce(
    (sum, d) => sum + (Number(d.estimated_pounds) || 0),
    0,
  );

  const monthly = donations.reduce<Record<string, number>>((acc, d) => {
    const key = d.created_at.slice(0, 7);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const monthlyRows = Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-ink">Reports</h1>
        <p className="text-muted mt-1">
          At-a-glance metrics for trailer requests. More visualizations TBD.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total requests", value: formatNumber(donations.length) },
          { label: "Completed", value: formatNumber(completed.length) },
          {
            label: "Est. completed lbs",
            value: formatNumber(totalPounds),
          },
          {
            label: "Est. completed value",
            value: formatCurrency(totalValue),
          },
        ].map((stat) => (
          <div key={stat.label} className="panel p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {stat.label}
            </p>
            <p className="text-3xl font-bold text-ink mt-2">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <ReportsCharts
        byStatus={byStatus}
        monthly={monthlyRows}
        reportCount={reports.length}
      />
    </div>
  );
}
