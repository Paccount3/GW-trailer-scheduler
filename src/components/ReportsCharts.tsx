"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Props = {
  byStatus: { status: string; count: number }[];
  monthly: { month: string; count: number }[];
  reportCount: number;
};

export function ReportsCharts({ byStatus, monthly, reportCount }: Props) {
  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="panel p-5">
        <h2 className="text-xl font-bold text-ink mb-4">
          Requests by status
        </h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byStatus}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="status" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#0057c8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold text-ink">
            Requests by month
          </h2>
          <p className="text-xs text-muted font-semibold">
            {reportCount} trailer report{reportCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#64748b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
