"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DonationRequest,
  DROPOFF_STORES,
  LoadValueSetting,
  STATUS_LABELS,
  TrailerReport,
} from "@/lib/types";
import { formatCurrency, formatNumber } from "@/lib/utils";

type Props = {
  donations: DonationRequest[];
  reports: TrailerReport[];
  loadSettings: LoadValueSetting[];
};

type DateRange = "all" | "last_30" | "last_90" | "year" | "custom";

const STATUS_COLORS = [
  "#0057c8",
  "#60a5fa",
  "#f59e0b",
  "#8b5cf6",
  "#16a34a",
  "#dc2626",
];

function localDate(daysAgo = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toLocaleDateString("en-CA");
}

function estimatedTotals(
  donations: DonationRequest[],
  reports: TrailerReport[],
  settings: LoadValueSetting[],
) {
  const completedPickup = new Map(
    reports
      .filter((report) => report.report_type === "pickup" && report.is_completed)
      .map((report) => [report.donation_request_id, report]),
  );

  return donations.reduce(
    (totals, donation) => {
      if (donation.status !== "completed") return totals;
      const report = completedPickup.get(donation.id);
      const loadSize =
        report?.extras &&
        typeof report.extras === "object" &&
        "estimated_load" in report.extras
          ? String(report.extras.estimated_load)
          : donation.load_size;
      const setting = settings.find((item) => item.load_size === loadSize);
      const pounds = setting
        ? Number(setting.estimated_pounds)
        : Number(donation.estimated_pounds) || 0;
      const value = setting
        ? pounds * Number(setting.value_per_pound)
        : Number(donation.estimated_value) || 0;
      totals.pounds += pounds;
      totals.value += value;
      return totals;
    },
    { pounds: 0, value: 0 },
  );
}

export function ReportsCharts({ donations, reports, loadSettings }: Props) {
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = useMemo(() => {
    let from = "";
    let to = localDate();
    if (dateRange === "last_30") from = localDate(29);
    if (dateRange === "last_90") from = localDate(89);
    if (dateRange === "year") from = `${new Date().getFullYear()}-01-01`;
    if (dateRange === "custom") {
      from = dateFrom;
      to = dateTo;
    }

    return donations.filter((donation) => {
      const created = donation.created_at.slice(0, 10);
      if (from && created < from) return false;
      if (to && created > to) return false;
      return true;
    });
  }, [dateFrom, dateRange, dateTo, donations]);

  const metrics = useMemo(() => {
    const filteredIds = new Set(filtered.map((donation) => donation.id));
    const filteredReports = reports.filter((report) =>
      filteredIds.has(report.donation_request_id),
    );
    const completed = filtered.filter(
      (donation) => donation.status === "completed",
    );
    const scheduled = filtered.filter((donation) => donation.scheduled_date);
    const leadDays = scheduled.map((donation) =>
      Math.max(
        0,
        Math.round(
          (new Date(`${donation.scheduled_date}T12:00:00`).getTime() -
            new Date(donation.created_at).getTime()) /
            86_400_000,
        ),
      ),
    );
    const totals = estimatedTotals(filtered, filteredReports, loadSettings);

    const countBy = (getKey: (donation: DonationRequest) => string) =>
      Object.entries(
        filtered.reduce<Record<string, number>>((counts, donation) => {
          const key = getKey(donation);
          counts[key] = (counts[key] || 0) + 1;
          return counts;
        }, {}),
      )
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    const towns = countBy(
      (donation) =>
        donation.dropoff_town?.trim() ||
        donation.city?.trim() ||
        "Not specified",
    );
    const sources = countBy(
      (donation) => donation.heard_about?.trim() || "Not specified",
    );
    const trailers = countBy(
      (donation) => donation.trailers?.name || "Unassigned",
    );
    const byStatus = countBy(
      (donation) => STATUS_LABELS[donation.status] || donation.status,
    );

    const storeCounts = new Map<string, {
      requests: number;
      completed: number;
      scheduled: number;
      active: number;
    }>();
    for (const store of DROPOFF_STORES) {
      storeCounts.set(store, {
        requests: 0,
        completed: 0,
        scheduled: 0,
        active: 0,
      });
    }
    storeCounts.set("Unassigned", {
      requests: 0,
      completed: 0,
      scheduled: 0,
      active: 0,
    });

    for (const donation of filtered) {
      const storeName =
        donation.dropoff_store?.trim() &&
        (DROPOFF_STORES as readonly string[]).includes(donation.dropoff_store)
          ? donation.dropoff_store
          : donation.dropoff_store?.trim() || "Unassigned";
      const current = storeCounts.get(storeName) || {
        requests: 0,
        completed: 0,
        scheduled: 0,
        active: 0,
      };
      current.requests += 1;
      if (donation.status === "completed") current.completed += 1;
      if (donation.scheduled_date) current.scheduled += 1;
      if (
        ["scheduled", "trailer_on_site", "ready_for_pickup"].includes(
          donation.status,
        )
      ) {
        current.active += 1;
      }
      storeCounts.set(storeName, current);
    }

    const dropoffStores = Array.from(storeCounts.entries())
      .map(([name, counts]) => ({
        name,
        ...counts,
        share: filtered.length
          ? Math.round((counts.requests / filtered.length) * 1000) / 10
          : 0,
      }))
      .sort((a, b) => {
        if (a.name === "Unassigned") return 1;
        if (b.name === "Unassigned") return -1;
        return (
          b.requests - a.requests || a.name.localeCompare(b.name)
        );
      });

    const monthly = Object.entries(
      filtered.reduce<Record<string, number>>((counts, donation) => {
        const month = donation.created_at.slice(0, 7);
        counts[month] = (counts[month] || 0) + 1;
        return counts;
      }, {}),
    )
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({
        month: new Date(`${month}-02T12:00:00`).toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        }),
        count,
      }));
    const pickupReports = filteredReports.filter(
      (report) => report.report_type === "pickup",
    );
    const completedPickupReports = pickupReports.filter(
      (report) => report.is_completed,
    ).length;

    return {
      completed,
      completionRate: filtered.length
        ? Math.round((completed.length / filtered.length) * 100)
        : 0,
      averageLeadDays: leadDays.length
        ? Math.round(
            (leadDays.reduce((sum, days) => sum + days, 0) / leadDays.length) *
              10,
          ) / 10
        : null,
      totals,
      towns,
      sources,
      trailers,
      byStatus,
      dropoffStores,
      storesWithRequests: dropoffStores.filter(
        (store) => store.name !== "Unassigned" && store.requests > 0,
      ).length,
      missingDropoffStore: filtered.filter(
        (donation) => !donation.dropoff_store?.trim(),
      ).length,
      monthly,
      completedPickupReports,
      pickupReportRate: pickupReports.length
        ? Math.round((completedPickupReports / pickupReports.length) * 100)
        : 0,
      missingTown: filtered.filter(
        (donation) => !donation.dropoff_town && !donation.city,
      ).length,
      unscheduled: filtered.filter((donation) => !donation.scheduled_date)
        .length,
    };
  }, [filtered, loadSettings, reports]);

  const rangeLabel =
    dateRange === "all"
      ? "All time"
      : dateRange === "last_30"
        ? "Last 30 days"
        : dateRange === "last_90"
          ? "Last 90 days"
          : dateRange === "year"
            ? "Year to date"
            : "Custom range";

  return (
    <div className="space-y-5">
      <section className="panel p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gw-blue">
              Reporting period
            </p>
            <h2 className="mt-1 text-xl font-bold text-ink">{rangeLabel}</h2>
            <p className="mt-1 text-sm text-muted">
              Metrics use the date each request was submitted.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:flex lg:items-end">
            <label className="text-sm font-semibold text-ink">
              Date range
              <select
                className="select mt-1 min-w-44"
                value={dateRange}
                onChange={(event) =>
                  setDateRange(event.target.value as DateRange)
                }
              >
                <option value="all">All time</option>
                <option value="last_30">Last 30 days</option>
                <option value="last_90">Last 90 days</option>
                <option value="year">Year to date</option>
                <option value="custom">Custom range</option>
              </select>
            </label>
            {dateRange === "custom" && (
              <>
                <label className="text-sm font-semibold text-ink">
                  From
                  <input
                    className="input mt-1"
                    type="date"
                    value={dateFrom}
                    onChange={(event) => setDateFrom(event.target.value)}
                  />
                </label>
                <label className="text-sm font-semibold text-ink">
                  Through
                  <input
                    className="input mt-1"
                    type="date"
                    value={dateTo}
                    onChange={(event) => setDateTo(event.target.value)}
                  />
                </label>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: "Requests", value: formatNumber(filtered.length) },
          {
            label: "Completed",
            value: formatNumber(metrics.completed.length),
            detail: `${metrics.completionRate}% completion rate`,
          },
          {
            label: "Estimated pounds",
            value: formatNumber(metrics.totals.pounds),
            detail: "Completed pickups",
          },
          {
            label: "Estimated value",
            value: formatCurrency(metrics.totals.value),
            detail: "Completed pickups",
          },
          {
            label: "Avg. days to scheduled date",
            value:
              metrics.averageLeadDays === null
                ? "—"
                : String(metrics.averageLeadDays),
            detail: "From request submission",
          },
        ].map((stat) => (
          <div key={stat.label} className="panel min-w-0 p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {stat.label}
            </p>
            <p className="mt-2 break-words text-2xl font-bold text-ink sm:text-3xl">
              {stat.value}
            </p>
            {stat.detail && (
              <p className="mt-1 text-xs text-muted">{stat.detail}</p>
            )}
          </div>
        ))}
      </section>

      {filtered.length === 0 ? (
        <div className="panel p-10 text-center">
          <h2 className="text-xl font-bold text-ink">No requests found</h2>
          <p className="mt-2 text-sm text-muted">
            Choose a wider reporting period to see results.
          </p>
        </div>
      ) : (
        <>
          <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="panel p-5">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-ink">
                  Most frequent towns
                </h2>
                <p className="text-sm text-muted">
                  Ranked by submitted trailer requests
                </p>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={metrics.towns.slice(0, 8)}
                    layout="vertical"
                    margin={{ left: 12, right: 20 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e5e7eb"
                      horizontal={false}
                    />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={90}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      name="Requests"
                      fill="#0057c8"
                      radius={[0, 5, 5, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel p-5">
              <h2 className="text-xl font-bold text-ink">Town breakdown</h2>
              <p className="mb-4 text-sm text-muted">
                {metrics.towns.length} town
                {metrics.towns.length === 1 ? "" : "s"} represented
              </p>
              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {metrics.towns.map((town, index) => (
                  <div
                    key={town.name}
                    className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2.5"
                  >
                    <span className="w-6 text-center text-xs font-bold text-muted">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold text-ink">
                      {town.name}
                    </span>
                    <span className="rounded-full bg-gw-blue-soft px-2.5 py-1 text-sm font-bold text-gw-blue-deep">
                      {town.count}
                    </span>
                    <span className="w-12 text-right text-xs text-muted">
                      {Math.round((town.count / filtered.length) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <div className="panel p-5">
              <h2 className="text-xl font-bold text-ink">Requests over time</h2>
              <p className="mb-4 text-sm text-muted">Requests submitted by month</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      name="Requests"
                      fill="#60a5fa"
                      radius={[5, 5, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel p-5">
              <h2 className="text-xl font-bold text-ink">Request status</h2>
              <p className="mb-4 text-sm text-muted">
                Current status of requests in this period
              </p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.byStatus}
                      dataKey="count"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {metrics.byStatus.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-3">
            <BreakdownList
              title="How people heard about us"
              rows={metrics.sources}
              total={filtered.length}
            />
            <BreakdownList
              title="Trailer assignments"
              rows={metrics.trailers}
              total={filtered.length}
            />
            <div className="panel p-5">
              <h2 className="text-xl font-bold text-ink">Operations checks</h2>
              <p className="mb-4 text-sm text-muted">
                Items that may need staff follow-up
              </p>
              <div className="space-y-3">
                <OperationRow
                  label="Requests without a scheduled date"
                  value={metrics.unscheduled}
                />
                <OperationRow
                  label="Requests without a drop-off store"
                  value={metrics.missingDropoffStore}
                />
                <OperationRow
                  label="Requests without a town"
                  value={metrics.missingTown}
                />
                <OperationRow
                  label="Completed pickup reports"
                  value={metrics.completedPickupReports}
                  detail={`${metrics.pickupReportRate}% of pickup reports`}
                />
              </div>
            </div>
          </section>

          <section className="panel overflow-hidden">
            <div className="border-b border-line px-4 py-4 sm:px-5 sm:py-5">
              <h2 className="text-xl font-bold text-ink">
                Drop-off store destinations
              </h2>
              <p className="mt-1 text-sm text-muted">
                Where trailers are staged for drop-off —{" "}
                {metrics.storesWithRequests} store
                {metrics.storesWithRequests === 1 ? "" : "s"} with assigned
                requests in this period
                {metrics.missingDropoffStore > 0
                  ? ` · ${metrics.missingDropoffStore} unassigned`
                  : ""}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead className="bg-surface text-xs font-bold uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3 sm:px-5">Drop-off store</th>
                    <th className="px-3 py-3 text-right">Requests</th>
                    <th className="px-3 py-3 text-right">Share</th>
                    <th className="px-3 py-3 text-right">Active</th>
                    <th className="px-3 py-3 text-right">Scheduled</th>
                    <th className="px-4 py-3 text-right sm:px-5">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {metrics.dropoffStores.map((store) => {
                    const isUnassigned = store.name === "Unassigned";
                    const barWidth = filtered.length
                      ? Math.max(
                          store.requests > 0
                            ? (store.requests / filtered.length) * 100
                            : 0,
                          0,
                        )
                      : 0;
                    return (
                      <tr
                        key={store.name}
                        className={
                          store.requests === 0 && !isUnassigned
                            ? "bg-white text-muted"
                            : "bg-white"
                        }
                      >
                        <td className="px-4 py-3 sm:px-5">
                          <div className="min-w-0">
                            <p
                              className={`font-semibold ${
                                isUnassigned ? "text-amber-800" : "text-ink"
                              }`}
                            >
                              {store.name}
                            </p>
                            <div className="mt-1.5 h-1.5 max-w-xs overflow-hidden rounded-full bg-gw-blue-soft">
                              <div
                                className={`h-full rounded-full ${
                                  isUnassigned ? "bg-amber-500" : "bg-gw-blue"
                                }`}
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-ink">
                          {formatNumber(store.requests)}
                        </td>
                        <td className="px-3 py-3 text-right text-muted">
                          {store.share}%
                        </td>
                        <td className="px-3 py-3 text-right font-semibold text-ink">
                          {formatNumber(store.active)}
                        </td>
                        <td className="px-3 py-3 text-right text-ink">
                          {formatNumber(store.scheduled)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-ink sm:px-5">
                          {formatNumber(store.completed)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function BreakdownList({
  title,
  rows,
  total,
}: {
  title: string;
  rows: { name: string; count: number }[];
  total: number;
}) {
  return (
    <div className="panel p-5">
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      <div className="mt-4 space-y-3">
        {rows.slice(0, 6).map((row) => (
          <div key={row.name}>
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-semibold text-ink">{row.name}</span>
              <span className="shrink-0 text-muted">
                {row.count} · {Math.round((row.count / total) * 100)}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gw-blue-soft">
              <div
                className="h-full rounded-full bg-gw-blue"
                style={{ width: `${(row.count / rows[0].count) * 100}%` }}
              />
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="text-sm text-muted">No data recorded.</p>
        )}
      </div>
    </div>
  );
}

function OperationRow({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-surface p-3">
      <div>
        <p className="text-sm font-semibold text-ink">{label}</p>
        {detail && <p className="text-xs text-muted">{detail}</p>}
      </div>
      <span className="shrink-0 text-2xl font-bold text-gw-blue-deep">
        {value}
      </span>
    </div>
  );
}
