"use client";

import {
  addDays,
  addWeeks,
  format,
  isSameDay,
  parseISO,
  startOfWeek,
} from "date-fns";
import { StatusBadge } from "@/components/StatusBadge";
import { DonationRequest, STATUS_LABELS, fullName } from "@/lib/types";

type Props = {
  donations: DonationRequest[];
  selectedId: string | null;
  weekStart: Date;
  onWeekChange: (weekStart: Date) => void;
  onSelect: (id: string) => void;
};

function dayKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function DonationsWeekCalendar({
  donations,
  selectedId,
  weekStart,
  onWeekChange,
  onSelect,
}: Props) {
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const today = new Date();

  const byDay = days.reduce<Record<string, DonationRequest[]>>((acc, day) => {
    const key = dayKey(day);
    acc[key] = donations
      .filter((donation) => donation.scheduled_date === key)
      .sort((a, b) => {
        const trailerCompare = (a.trailers?.name || "").localeCompare(
          b.trailers?.name || "",
        );
        if (trailerCompare !== 0) return trailerCompare;
        return fullName(a).localeCompare(fullName(b));
      });
    return acc;
  }, {});

  const unscheduled = donations
    .filter((donation) => !donation.scheduled_date)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const weekLabel = `${format(weekStart, "MMM d")} – ${format(
    addDays(weekStart, 6),
    "MMM d, yyyy",
  )}`;

  return (
    <div className="space-y-4">
      <div className="panel flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gw-blue">
            Weekly calendar
          </p>
          <h2 className="text-xl font-bold text-ink">{weekLabel}</h2>
          <p className="text-sm text-muted">
            Requests shown by scheduled drop-off / pickup date
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-secondary !py-2 !px-3 text-sm"
            onClick={() => onWeekChange(addWeeks(weekStart, -1))}
          >
            Previous week
          </button>
          <button
            type="button"
            className="btn btn-secondary !py-2 !px-3 text-sm"
            onClick={() =>
              onWeekChange(startOfWeek(new Date(), { weekStartsOn: 1 }))
            }
          >
            This week
          </button>
          <button
            type="button"
            className="btn btn-secondary !py-2 !px-3 text-sm"
            onClick={() => onWeekChange(addWeeks(weekStart, 1))}
          >
            Next week
          </button>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="grid grid-cols-7 divide-x divide-line border-b border-line bg-surface">
          {days.map((day) => {
            const key = dayKey(day);
            const count = byDay[key]?.length || 0;
            const isToday = isSameDay(day, today);
            return (
              <div key={key} className="min-w-0 px-1.5 py-2 sm:px-2 sm:py-2.5">
                <p
                  className={`text-[10px] font-bold uppercase tracking-wide sm:text-xs ${
                    isToday ? "text-gw-blue" : "text-muted"
                  }`}
                >
                  {format(day, "EEE")}
                </p>
                <div className="mt-0.5 flex items-baseline justify-between gap-1">
                  <p
                    className={`text-sm font-bold sm:text-base ${
                      isToday ? "text-gw-blue-deep" : "text-ink"
                    }`}
                  >
                    {format(day, "M/d")}
                  </p>
                  <span className="text-[10px] font-semibold text-muted sm:text-xs">
                    {count}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-7 divide-x divide-line">
          {days.map((day) => {
            const key = dayKey(day);
            const items = byDay[key] || [];
            const isToday = isSameDay(day, today);
            return (
              <div
                key={key}
                className={`min-h-[32rem] min-w-0 space-y-1.5 overflow-y-auto p-1 sm:min-h-[36rem] sm:p-1.5 ${
                  isToday ? "bg-[rgba(0,87,200,0.04)]" : "bg-white"
                }`}
              >
                {items.length === 0 ? (
                  <p className="px-0.5 py-5 text-center text-[10px] text-muted sm:text-xs">
                    No requests
                  </p>
                ) : (
                  items.map((donation) => {
                    const active = selectedId === donation.id;
                    return (
                      <button
                        key={donation.id}
                        type="button"
                        onClick={() => onSelect(donation.id)}
                        className={`w-full min-w-0 rounded-lg border p-1.5 text-left transition sm:p-2 ${
                          active
                            ? "border-gw-blue bg-gw-blue-soft ring-2 ring-gw-blue/20"
                            : "border-line bg-white hover:border-gw-blue/40 hover:bg-surface"
                        }`}
                      >
                        <p className="truncate text-[11px] font-bold text-gw-blue sm:text-xs">
                          #{donation.reference_code}
                        </p>
                        <div className="mt-1">
                          <StatusBadge status={donation.status} />
                        </div>
                        <p className="mt-1 truncate text-xs font-bold text-ink">
                          {fullName(donation)}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] font-semibold text-ink sm:text-xs">
                          {donation.trailers?.name || "No trailer"}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-muted sm:text-xs">
                          {donation.dropoff_store || "No store"}
                        </p>
                        {(donation.dropoff_town || donation.city) && (
                          <p className="mt-0.5 truncate text-[10px] text-muted sm:text-xs">
                            {donation.dropoff_town || donation.city}
                          </p>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-ink">Unscheduled requests</h3>
            <p className="text-sm text-muted">
              No scheduled date yet — assign one in the details panel
            </p>
          </div>
          <p className="text-sm font-semibold text-muted">
            {unscheduled.length} request{unscheduled.length === 1 ? "" : "s"}
          </p>
        </div>
        {unscheduled.length === 0 ? (
          <p className="text-sm text-muted">All filtered requests are scheduled.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {unscheduled.map((donation) => {
              const active = selectedId === donation.id;
              return (
                <button
                  key={donation.id}
                  type="button"
                  onClick={() => onSelect(donation.id)}
                  className={`rounded-xl border p-3 text-left ${
                    active
                      ? "border-gw-blue bg-gw-blue-soft ring-2 ring-gw-blue/20"
                      : "border-line bg-white hover:bg-surface"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-gw-blue">
                      #{donation.reference_code}
                    </p>
                    <StatusBadge status={donation.status} />
                  </div>
                  <p className="mt-1 font-semibold text-ink">
                    {fullName(donation)}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {donation.trailers?.name || "No trailer"} ·{" "}
                    {STATUS_LABELS[donation.status]}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function currentWeekStart(reference = new Date()) {
  return startOfWeek(reference, { weekStartsOn: 1 });
}

export function weekStartFromDateString(value: string | null | undefined) {
  if (!value) return currentWeekStart();
  try {
    return startOfWeek(parseISO(value), { weekStartsOn: 1 });
  } catch {
    return currentWeekStart();
  }
}
