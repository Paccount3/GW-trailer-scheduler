"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  DonationsWeekCalendar,
  currentWeekStart,
  weekStartFromDateString,
} from "@/components/DonationsWeekCalendar";
import { StatusBadge } from "@/components/StatusBadge";
import {
  deleteBrowserDonation,
  ensureBrowserDemo,
  updateBrowserDonation,
} from "@/lib/browser-demo-store";
import {
  DonationRequest,
  DONATION_STATUSES,
  DROPOFF_STORES,
  LOAD_SIZE_LABELS,
  LoadValueSetting,
  STATUS_LABELS,
  Trailer,
  fullName,
} from "@/lib/types";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";

type Props = {
  initialDonations: DonationRequest[];
  trailers: Trailer[];
  loadSettings: LoadValueSetting[];
  pickupReports: Record<
    string,
    {
      id: string;
      completed: boolean;
      estimatedLoad: string | null;
      estimatedLoadOther: string | null;
    }
  >;
  browserDemo?: boolean;
};

export function ManageDonationsClient({
  initialDonations,
  trailers: initialTrailers,
  loadSettings: initialLoadSettings,
  pickupReports: initialPickupReports,
  browserDemo = false,
}: Props) {
  const [hydrated, setHydrated] = useState(!browserDemo);
  const [donations, setDonations] = useState(
    browserDemo ? [] : initialDonations,
  );
  const [trailers, setTrailers] = useState(initialTrailers);
  const [loadSettings, setLoadSettings] = useState(initialLoadSettings);
  const [pickupReports, setPickupReports] = useState(initialPickupReports);
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");
  const [weekStart, setWeekStart] = useState(() =>
    weekStartFromDateString(
      initialDonations.find((donation) => donation.scheduled_date)?.scheduled_date,
    ) || currentWeekStart(),
  );
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<
    "all" | "today" | "next_7" | "next_30" | "custom"
  >("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dateSort, setDateSort] = useState<
    "newest_request" | "pickup_asc" | "pickup_desc"
  >("newest_request");
  const [selectedId, setSelectedId] = useState<string | null>(
    browserDemo ? null : (initialDonations[0]?.id ?? null),
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!browserDemo) return;
    const state = ensureBrowserDemo({
      trailers: initialTrailers,
      loadSettings: initialLoadSettings,
    });
    setDonations(state.donations);
    setTrailers(state.trailers.length ? state.trailers : initialTrailers);
    setLoadSettings(
      state.loadSettings.length ? state.loadSettings : initialLoadSettings,
    );
    setPickupReports(
      Object.fromEntries(
        state.reports
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
      ),
    );
    setSelectedId(state.donations[0]?.id ?? null);
    setWeekStart(
      weekStartFromDateString(
        state.donations.find((donation) => donation.scheduled_date)
          ?.scheduled_date,
      ) || currentWeekStart(),
    );
    setHydrated(true);
  }, [browserDemo, initialTrailers, initialLoadSettings]);

  const selected = donations.find((d) => d.id === selectedId) || null;

  function selectDonation(id: string) {
    setSelectedId(id);
    setError("");
    setMessage("");
  }

  function loadDisplay(donationId: string) {
    const report = pickupReports[donationId];
    if (!report?.completed) return "Awaiting Pick Up";
    if (report.estimatedLoad === "other") {
      return report.estimatedLoadOther || "Other";
    }
    return report.estimatedLoad
      ? LOAD_SIZE_LABELS[
          report.estimatedLoad as keyof typeof LOAD_SIZE_LABELS
        ] || report.estimatedLoad
      : "Not recorded";
  }

  function reportedEstimate(donation: DonationRequest) {
    const report = pickupReports[donation.id];
    if (!report?.completed) return null;
    const setting = loadSettings.find(
      (item) => item.load_size === report.estimatedLoad,
    );
    if (setting) {
      const pounds = Number(setting.estimated_pounds);
      return {
        pounds,
        value: pounds * Number(setting.value_per_pound),
      };
    }
    return {
      pounds: donation.estimated_pounds,
      value: donation.estimated_value,
    };
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const today = new Date().toISOString().slice(0, 10);
    const futureDate = (days: number) => {
      const value = new Date();
      value.setDate(value.getDate() + days);
      return value.toISOString().slice(0, 10);
    };

    const rows = donations.filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false;

      if (dateRange !== "all") {
        if (!d.scheduled_date) return false;
        const from =
          dateRange === "today" || dateRange === "next_7" || dateRange === "next_30"
            ? today
            : dateFrom;
        const to =
          dateRange === "today"
            ? today
            : dateRange === "next_7"
              ? futureDate(7)
              : dateRange === "next_30"
                ? futureDate(30)
                : dateTo;
        if (from && d.scheduled_date < from) return false;
        if (to && d.scheduled_date > to) return false;
      }

      if (!q) return true;
      const hay = [
        d.reference_code,
        d.first_name,
        d.last_name,
        d.organization,
        d.email,
        d.phone,
        d.city,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });

    return rows.sort((a, b) => {
      if (dateSort === "newest_request") {
        return b.created_at.localeCompare(a.created_at);
      }
      if (!a.scheduled_date) return 1;
      if (!b.scheduled_date) return -1;
      return dateSort === "pickup_asc"
        ? a.scheduled_date.localeCompare(b.scheduled_date)
        : b.scheduled_date.localeCompare(a.scheduled_date);
    });
  }, [
    donations,
    query,
    statusFilter,
    dateRange,
    dateFrom,
    dateTo,
    dateSort,
  ]);

  const busyTrailerIds = useMemo(() => {
    const set = new Set<string>();
    donations.forEach((d) => {
      if (
        d.trailer_id &&
        ["scheduled", "trailer_on_site", "ready_for_pickup"].includes(d.status) &&
        d.id !== selectedId
      ) {
        set.add(d.trailer_id);
      }
    });
    return set;
  }, [donations, selectedId]);

  async function savePatch(patch: Record<string, unknown>) {
    if (!selected) return;
    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (browserDemo) {
        const updated = updateBrowserDonation(
          selected.id,
          patch as Partial<DonationRequest>,
        );
        setDonations((prev) =>
          prev.map((d) => (d.id === updated.id ? updated : d)),
        );
        setMessage("Saved");
        setSaving(false);
        return;
      }

      const res = await fetch(`/api/donations/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      const body = await res.json().catch(() => ({}));
      setSaving(false);

      if (!res.ok) {
        setError(body.error || "Failed to save");
        return;
      }

      setDonations((prev) =>
        prev.map((d) => (d.id === body.id ? (body as DonationRequest) : d)),
      );
      setMessage("Saved");
    } catch (err) {
      setSaving(false);
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  }

  async function deleteSelected() {
    if (!selected) return;
    setDeleting(true);
    setError("");

    try {
      if (browserDemo) {
        deleteBrowserDonation(selected.id);
        const remaining = donations.filter(
          (donation) => donation.id !== selected.id,
        );
        setDonations(remaining);
        setSelectedId(remaining[0]?.id ?? null);
        setDeleting(false);
        setConfirmDelete(false);
        setMessage("");
        return;
      }

      const res = await fetch(`/api/donations/${selected.id}`, {
        method: "DELETE",
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setDeleting(false);
        setConfirmDelete(false);
        setError(body.error || "Failed to delete request");
        return;
      }

      const remaining = donations.filter(
        (donation) => donation.id !== selected.id,
      );
      setDonations(remaining);
      setSelectedId(remaining[0]?.id ?? null);
      setDeleting(false);
      setConfirmDelete(false);
      setMessage("");
    } catch (err) {
      setDeleting(false);
      setConfirmDelete(false);
      setError(err instanceof Error ? err.message : "Failed to delete request");
    }
  }

  if (browserDemo && !hydrated) {
    return (
      <div className="panel p-8 text-muted">Loading browser demo data…</div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="panel flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gw-blue">
            Display
          </p>
          <p className="text-sm text-muted">
            Switch between the request list and a weekly schedule board.
          </p>
        </div>
        <div
          className="inline-flex rounded-xl border border-line bg-surface p-1"
          role="group"
          aria-label="Manage donations view"
        >
          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
              viewMode === "table"
                ? "bg-gw-blue text-white"
                : "text-ink hover:bg-white"
            }`}
            onClick={() => setViewMode("table")}
          >
            Table view
          </button>
          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
              viewMode === "calendar"
                ? "bg-gw-blue text-white"
                : "text-ink hover:bg-white"
            }`}
            onClick={() => setViewMode("calendar")}
          >
            Calendar view
          </button>
        </div>
      </div>

      <div className="panel p-3 sm:p-4 grid sm:grid-cols-2 xl:grid-cols-[minmax(14rem,1.3fr)_minmax(10rem,0.8fr)_minmax(10rem,0.8fr)_minmax(12rem,0.9fr)_auto] gap-3 items-end">
        <input
          className="input min-h-11"
          placeholder="Search name, org, code, phone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="select min-h-11"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          {DONATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        {viewMode === "table" ? (
          <>
            <select
              className="select min-h-11"
              value={dateRange}
              onChange={(event) =>
                setDateRange(
                  event.target.value as
                    | "all"
                    | "today"
                    | "next_7"
                    | "next_30"
                    | "custom",
                )
              }
              aria-label="Pickup date range"
            >
              <option value="all">All pickup dates</option>
              <option value="today">Today</option>
              <option value="next_7">Next 7 days</option>
              <option value="next_30">Next 30 days</option>
              <option value="custom">Custom range</option>
            </select>
            <select
              className="select min-h-11"
              value={dateSort}
              onChange={(event) =>
                setDateSort(
                  event.target.value as
                    | "newest_request"
                    | "pickup_asc"
                    | "pickup_desc",
                )
              }
              aria-label="Date sort order"
            >
              <option value="newest_request">Newest requests</option>
              <option value="pickup_asc">Pickup: earliest first</option>
              <option value="pickup_desc">Pickup: latest first</option>
            </select>
          </>
        ) : (
          <div className="sm:col-span-2 rounded-lg bg-surface px-3 py-3 text-sm text-muted">
            Calendar weeks are Monday–Sunday. Use Previous / Next week to move
            through the schedule. Status and search filters still apply.
          </div>
        )}
        <p className="text-sm text-muted xl:text-right xl:pb-3">
          {filtered.length} request{filtered.length === 1 ? "" : "s"}
        </p>
        {viewMode === "table" && dateRange === "custom" && (
          <div className="sm:col-span-2 xl:col-span-5 grid sm:grid-cols-2 gap-3 rounded-lg bg-surface p-3">
            <label className="text-sm font-semibold">
              Pickup date from
              <input
                type="date"
                className="input mt-1"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
              />
            </label>
            <label className="text-sm font-semibold">
              Pickup date through
              <input
                type="date"
                className="input mt-1"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </label>
          </div>
        )}
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1.85fr)_minmax(19rem,0.72fr)] gap-4 items-start">
        {viewMode === "calendar" ? (
          <DonationsWeekCalendar
            donations={filtered}
            selectedId={selectedId}
            weekStart={weekStart}
            onWeekChange={setWeekStart}
            onSelect={selectDonation}
          />
        ) : (
          <>
        {/* Card list for phone / tablet */}
        <div className="xl:hidden space-y-3">
          {filtered.map((d) => {
            const active = selectedId === d.id;
            return (
              <article
                key={d.id}
                role="button"
                tabIndex={0}
                onClick={() => selectDonation(d.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    selectDonation(d.id);
                  }
                }}
                className={
                  active
                    ? "panel w-full text-left p-4 border-gw-blue ring-2 ring-gw-blue/20 touch-manipulation"
                    : "panel w-full text-left p-4 touch-manipulation"
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gw-blue">#{d.reference_code}</p>
                    <p className="text-xl font-bold text-ink truncate">
                      {fullName(d)}
                    </p>
                    <p className="text-sm text-muted truncate">
                      {d.organization || d.email || d.requested_days || "—"}
                    </p>
                  </div>
                  <StatusBadge status={d.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                  <span>{d.trailers?.name || "No trailer"}</span>
                  <span>
                    Store:{" "}
                    <span className="font-semibold text-ink">
                      {d.dropoff_store || "Unassigned"}
                    </span>
                  </span>
                  <span className="font-semibold">{loadDisplay(d.id)}</span>
                  {pickupReports[d.id]?.completed && (
                    <span>
                      {formatCurrency(reportedEstimate(d)?.value)}
                    </span>
                  )}
                  {pickupReports[d.id]?.completed ? (
                    <Link
                      href={`/staff/trailer-reports/${pickupReports[d.id].id}`}
                      className="font-semibold text-gw-blue underline underline-offset-2"
                      onClick={(event) => event.stopPropagation()}
                    >
                      View completed report
                    </Link>
                  ) : (
                    <span className="font-semibold">Report not completed</span>
                  )}
                </div>
              </article>
            );
          })}
          {filtered.length === 0 && (
            <div className="panel p-8 text-center text-muted">
              No matching requests
            </div>
          )}
        </div>

        {/* Wide table for desktop */}
        <div className="panel table-wrap hidden xl:block">
          <table className="data">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Requested</th>
                <th>Status</th>
                <th>Trailer</th>
                <th>Dropoff Store</th>
                <th>Load</th>
                <th>Value</th>
                <th>Pickup Report</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr
                  key={d.id}
                  onClick={() => selectDonation(d.id)}
                  className={
                    selectedId === d.id
                      ? "bg-[rgba(0,61,165,0.06)] cursor-pointer"
                      : "hover:bg-surface cursor-pointer"
                  }
                >
                  <td className="font-semibold text-gw-blue">#{d.reference_code}</td>
                  <td>
                    <div className="font-semibold">{fullName(d)}</div>
                    <div className="text-xs text-muted">
                      {d.organization || d.email || "—"}
                    </div>
                  </td>
                  <td className="text-sm">{d.requested_days || "—"}</td>
                  <td>
                    <StatusBadge status={d.status} />
                  </td>
                  <td>{d.trailers?.name || "—"}</td>
                  <td>{d.dropoff_store || "—"}</td>
                  <td>
                    <span className="font-semibold">{loadDisplay(d.id)}</span>
                    {pickupReports[d.id]?.completed && (
                      <div className="text-xs text-muted">
                        {formatNumber(reportedEstimate(d)?.pounds)} lbs
                      </div>
                    )}
                  </td>
                  <td>
                    {pickupReports[d.id]?.completed
                      ? formatCurrency(reportedEstimate(d)?.value)
                      : "—"}
                  </td>
                  <td>
                    {pickupReports[d.id]?.completed ? (
                      <Link
                        href={`/staff/trailer-reports/${pickupReports[d.id].id}`}
                        className="status-pill bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={(event) => event.stopPropagation()}
                      >
                        Completed
                      </Link>
                    ) : (
                      <span className="status-pill bg-slate-200 text-slate-700">
                        Not completed
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center text-muted py-10">
                    No matching requests
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
          </>
        )}

        <aside className="panel p-4 sm:p-5 xl:sticky xl:top-6">
          {selected ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Work Order #{selected.reference_code}
                </p>
                <h2 className="text-2xl font-bold text-ink">
                  {fullName(selected)}
                </h2>
                <p className="text-sm text-muted mt-1">
                  {[selected.address_line1, selected.city, selected.state, selected.zip]
                    .filter(Boolean)
                    .join(", ") || "No address on file"}
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted">Phone</dt>
                  <dd className="font-semibold">{selected.phone || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Email</dt>
                  <dd className="font-semibold break-all">
                    {selected.email || "—"}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted">Requested days</dt>
                  <dd className="font-semibold">
                    {selected.requested_days || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Hold harmless</dt>
                  <dd className="font-semibold">
                    {selected.hold_harmless ? "Yes" : "No"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Submitted</dt>
                  <dd className="font-semibold">
                    {formatDate(selected.created_at)}
                  </dd>
                </div>
              </dl>

              <label className="block text-sm font-semibold">
                Status
                <select
                  className="select mt-1.5 min-h-11"
                  value={selected.status}
                  disabled={saving}
                  onChange={(e) => savePatch({ status: e.target.value })}
                >
                  {DONATION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-semibold">
                Assign trailer
                <select
                  className="select mt-1.5 min-h-11"
                  value={selected.trailer_id || ""}
                  disabled={saving}
                  onChange={(e) =>
                    savePatch({ trailer_id: e.target.value || null })
                  }
                >
                  <option value="">Unassigned</option>
                  {trailers.map((t) => {
                    const busy = busyTrailerIds.has(t.id);
                    const isCurrent = selected.trailer_id === t.id;
                    return (
                      <option key={t.id} value={t.id} disabled={busy && !isCurrent}>
                        {t.name}
                        {!t.is_active ? " (inactive)" : ""}
                        {busy && !isCurrent ? " — in use" : ""}
                      </option>
                    );
                  })}
                </select>
              </label>

              <label className="block text-sm font-semibold">
                Dropoff Store
                <select
                  className="select mt-1.5 min-h-11"
                  value={selected.dropoff_store || ""}
                  disabled={saving}
                  onChange={(e) =>
                    savePatch({ dropoff_store: e.target.value || null })
                  }
                >
                  <option value="">Unassigned</option>
                  {DROPOFF_STORES.map((store) => (
                    <option key={store} value={store}>
                      {store}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-semibold">
                Scheduled date
                <input
                  type="date"
                  className="input mt-1.5 min-h-11"
                  value={selected.scheduled_date || ""}
                  disabled={saving}
                  onChange={(e) => {
                    const nextDate = e.target.value || null;
                    savePatch({ scheduled_date: nextDate });
                    if (nextDate) {
                      setWeekStart(weekStartFromDateString(nextDate));
                    }
                  }}
                />
              </label>

              <div className="rounded-xl border border-line bg-surface p-3 text-sm">
                <p className="text-muted">Reported load</p>
                <p className="mt-1 font-bold">{loadDisplay(selected.id)}</p>
                <p className="mt-1 text-xs text-muted">
                  Set automatically when the pickup report is completed.
                </p>
              </div>

              <div className="rounded-xl bg-surface border border-line p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Est. pounds</span>
                  <span className="font-semibold">
                    {pickupReports[selected.id]?.completed
                      ? formatNumber(reportedEstimate(selected)?.pounds)
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-muted">Est. value</span>
                  <span className="font-semibold">
                    {pickupReports[selected.id]?.completed
                      ? formatCurrency(reportedEstimate(selected)?.value)
                      : "—"}
                  </span>
                </div>
              </div>

              <label className="block text-sm font-semibold">
                Staff notes
                <textarea
                  className="textarea mt-1.5 min-h-24"
                  defaultValue={selected.staff_notes || ""}
                  key={selected.id}
                  onBlur={(e) => {
                    if ((selected.staff_notes || "") !== e.target.value) {
                      savePatch({ staff_notes: e.target.value });
                    }
                  }}
                />
              </label>

              <Link
                href={`/staff/manage/${selected.id}/request`}
                className="btn btn-secondary w-full"
              >
                View signed request
              </Link>
              {selected.signature && (
                <p className="text-center text-xs text-muted">
                  {selected.staff_signature
                    ? "Agreement is counter-signed — export PDF from the signed request page."
                    : "Applicant signed — open the signed request to counter-sign and export PDF."}
                </p>
              )}

              {pickupReports[selected.id]?.completed ? (
                <Link
                  href={`/staff/trailer-reports/${pickupReports[selected.id].id}`}
                  className="btn btn-primary w-full"
                >
                  View completed report
                </Link>
              ) : (
                <Link
                  href={`/staff/trailer-reports?donation=${selected.id}`}
                  className="btn btn-secondary w-full"
                >
                  Open pickup report
                </Link>
              )}

              <div className="border-t border-line pt-4">
                <button
                  type="button"
                  className="btn w-full border border-red-300 bg-white text-red-700 hover:bg-red-50"
                  disabled={saving || deleting}
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete this request
                </button>
                <p className="mt-2 text-center text-xs text-muted">
                  Permanently removes the request and its trailer reports.
                </p>
              </div>

              {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
              {message && !error && (
                <p className="text-sm text-success">{message}</p>
              )}
            </div>
          ) : (
            <p className="text-muted">Select a request to manage it.</p>
          )}
        </aside>
      </div>

      {confirmDelete && selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-request-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) {
              setConfirmDelete(false);
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <p className="text-sm font-bold uppercase tracking-wide text-red-700">
              Permanent action
            </p>
            <h2
              id="delete-request-title"
              className="mt-2 text-2xl font-bold text-ink"
            >
              Delete request #{selected.reference_code}?
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              The request for {fullName(selected)}, its signed submission,
              uploaded documents, and linked trailer reports will be
              permanently removed. This cannot be undone.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={deleting}
                onClick={() => setConfirmDelete(false)}
              >
                Keep request
              </button>
              <button
                type="button"
                className="btn bg-red-600 text-white hover:bg-red-700"
                disabled={deleting}
                onClick={deleteSelected}
              >
                {deleting ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
