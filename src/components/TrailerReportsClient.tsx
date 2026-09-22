"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { ReportPhotoField } from "@/components/ReportPhotoField";
import {
  DonationRequest,
  InspectionItemResult,
  InspectionResult,
  LOAD_SIZE_LABELS,
  LOAD_SIZES,
  LoadSize,
  LoadValueSetting,
  PickupInspectionData,
  TowReadiness,
  TrailerReport,
  calcLoadEstimate,
  fullName,
} from "@/lib/types";
import { formatCurrency, formatNumber } from "@/lib/utils";

type Props = {
  initialReports: TrailerReport[];
  donations: DonationRequest[];
  loadSettings: LoadValueSetting[];
  initialDonationId?: string;
};

const inspectionItems = [
  ["access_route", "Access route clear; tow vehicle can enter/exit safely"],
  ["placement", "Trailer has not been moved from approved placement"],
  ["coupler", "Coupler, latch, safety chains and breakaway cable intact"],
  ["tongue_jack", "Tongue jack operates; jack/foot not bent or damaged"],
  ["tires", "Tires inflated; no cuts, bulges, exposed cords or flats"],
  ["wheels", "Wheels/lug nuts present; fenders and axles appear sound"],
  ["doors", "Rear/side doors close, latch and secure normally"],
  ["lights", "Exterior lights/reflectors/license plate present and intact"],
  ["load", "Load is stable, contained, and will not shift into doors"],
  ["hazards", "No visible leak, odor, smoke, pests, sharp hazard or spill"],
] as const;

const damageAreas = [
  ["curb_side", "Curb Side / Passenger Side"],
  ["road_side", "Road Side / Driver Side"],
  ["front_tongue", "Front / Tongue"],
  ["rear_doors", "Rear / Doors"],
] as const;

const exteriorComponents = [
  ["body", "Body panels / roof / corners"],
  ["doors", "Doors / hinges / latches / seals"],
  ["coupler", "Coupler / chains / breakaway system"],
  ["jack", "Jack / tongue / frame"],
  ["tires", "Tires / wheels / fenders"],
  ["lights", "Lights / wiring / reflectors"],
  ["branding", "Branding / decals / signage"],
  ["license", "License plate / registration holder"],
] as const;

const interiorItems = [
  ["surfaces", "Floor, walls, ceiling and door interior free of new damage"],
  ["water", "No water intrusion; donations appear dry"],
  ["pests", "No mold/mildew, insects, rodents or infestation signs"],
  ["trash", "No trash, broken items or visibly non-salable materials"],
  ["hazmat", "No chemicals, paint, fuel, oil, batteries or hazardous waste"],
  ["mattresses", "No mattresses/box springs, large appliances or building materials"],
  ["weapons", "No firearms, explosives, tube TVs, sleeper sofas or pianos/organs"],
  ["condition", "Donations are in good, clean and working condition"],
  ["capacity", "Load below safe capacity; doors can open without falling items"],
  ["clearance", "Interior swept/clear enough for safe unloading"],
] as const;

const equipmentItems = [
  ["keys", "Keys / Goodwill locks"],
  ["wheel_chocks", "Wheel chocks"],
  ["straps", "Load bars / straps / tie-downs"],
  ["jack_accessories", "Jack handle / stabilizer accessories"],
  ["broom", "Broom / dustpan"],
  ["donor_guide", "Donor guide / operating signage"],
  ["spare_tire", "Spare tire / tire accessory"],
  ["other", "Other"],
] as const;

function emptyInspection(): PickupInspectionData {
  return {
    completed: false,
    completed_at: null,
    pickup_date: new Date().toISOString().slice(0, 10),
    pickup_time: "",
    pickup_period: "AM",
    pickup_location: "",
    responsible_signer_present: "yes",
    goodwill_driver: "",
    scheduled_pickup: "yes",
    notice_issue: "na",
    weather_conditions: "",
    tow_readiness: "safe_to_tow",
    inspection_items: Object.fromEntries(
      inspectionItems.map(([key]) => [
        key,
        { result: "not_checked", notes: "", photo_reference: "" },
      ]),
    ),
    exterior_damage: Object.fromEntries(
      damageAreas.map(([key]) => [key, ""]),
    ),
    exterior_components: Object.fromEntries(
      exteriorComponents.map(([key]) => [
        key,
        {
          result: "not_checked",
          notes: "",
          photo_reference: "",
        },
      ]),
    ),
    interior_items: Object.fromEntries(
      interiorItems.map(([key]) => [
        key,
        {
          result: "not_checked",
          notes: "",
          photo_reference: "",
        },
      ]),
    ),
    estimated_load: "quarter",
    estimated_load_other: "",
    accepted_item_exception: "no",
    accepted_item_exception_details: "",
    equipment_inventory: Object.fromEntries(
      equipmentItems.map(([key]) => [
        key,
        {
          quantity_out: "",
          quantity_in: "",
          missing_or_damaged: false,
          notes: "",
          photo_reference: "",
        },
      ]),
    ),
    damage_log: Array.from({ length: 4 }, () => ({
      type: "new" as const,
      description: "",
      action_taken: "",
      photo_reference: "",
    })),
    responsible_signer_signature: "",
    responsible_signer_signed_at: "",
    driver_signature: "",
    driver_signed_at: "",
    supervisor_contacted: "",
    supervisor_contacted_at: "",
    supervisor_direction: "",
    acknowledgment_confirmed: false,
  };
}

function normalizeInspection(
  saved: PickupInspectionData,
): PickupInspectionData {
  const empty = emptyInspection();
  return {
    ...empty,
    ...saved,
    inspection_items: {
      ...empty.inspection_items,
      ...saved.inspection_items,
    },
    exterior_damage: {
      ...empty.exterior_damage,
      ...saved.exterior_damage,
    },
    exterior_components: {
      ...empty.exterior_components,
      ...saved.exterior_components,
    },
    interior_items: {
      ...empty.interior_items,
      ...saved.interior_items,
    },
    equipment_inventory: {
      ...empty.equipment_inventory,
      ...saved.equipment_inventory,
    },
    damage_log:
      saved.damage_log?.length > 0 ? saved.damage_log : empty.damage_log,
  };
}

function isPickupData(
  extras: TrailerReport["extras"],
): extras is PickupInspectionData {
  return Boolean(extras && "inspection_items" in extras);
}

function inspectionStateForDonation(
  donationId: string,
  donations: DonationRequest[],
  reports: TrailerReport[],
) {
  const report = reports.find(
    (item) =>
      item.donation_request_id === donationId &&
      item.report_type === "pickup",
  );
  if (report && isPickupData(report.extras)) {
    return {
      form: normalizeInspection(report.extras),
      notes: report.notes || "",
    };
  }

  const form = emptyInspection();
  const donation = donations.find((item) => item.id === donationId);
  if (donation) {
    form.pickup_date = donation.scheduled_date || form.pickup_date;
    form.pickup_location = [
      donation.address_line1,
      donation.address_line2,
      donation.city,
      donation.state,
      donation.zip,
    ]
      .filter(Boolean)
      .join(", ");
  }
  return { form, notes: "" };
}

function ChoiceGroup<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string; tone?: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-3 mt-3">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`min-h-14 min-w-28 rounded-lg border px-5 text-base font-bold transition-colors touch-manipulation ${
            value === option.value
              ? option.tone || "border-gw-blue bg-gw-blue text-white"
              : "border-line bg-white text-muted"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function OptionalDetails({
  id,
  donationId,
  notes,
  photoReference,
  expanded,
  onToggle,
  onNotesChange,
  onPhotoChange,
}: {
  id: string;
  donationId: string;
  notes: string;
  photoReference: string;
  expanded: Record<string, boolean>;
  onToggle: (key: string, open: boolean) => void;
  onNotesChange: (value: string) => void;
  onPhotoChange: (value: string) => void;
}) {
  const noteKey = `${id}:note`;
  const photoKey = `${id}:photo`;
  const showNote = Boolean(notes) || Boolean(expanded[noteKey]);
  const showPhoto =
    Boolean(photoReference) || Boolean(expanded[photoKey]);

  return (
    <div className="w-full space-y-2">
      <div className="flex flex-wrap justify-center gap-5">
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            className="size-5"
            checked={showNote}
            onChange={(event) => {
              onToggle(noteKey, event.target.checked);
              if (!event.target.checked) onNotesChange("");
            }}
          />
          Add note
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            className="size-5"
            checked={showPhoto}
            onChange={(event) => {
              onToggle(photoKey, event.target.checked);
              if (!event.target.checked) onPhotoChange("");
            }}
          />
          Add photo
        </label>
      </div>
      {(showNote || showPhoto) && (
        <div className="grid gap-3 pt-1 sm:grid-cols-2">
          {showNote && (
            <input
              className="input"
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              placeholder="Note / issue details"
            />
          )}
          {showPhoto && (
            <div className={showNote ? "" : "sm:col-span-2"}>
              <ReportPhotoField
                donationId={donationId}
                fieldKey={id}
                value={photoReference}
                onChange={onPhotoChange}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TrailerReportsClient({
  initialReports,
  donations,
  loadSettings,
  initialDonationId,
}: Props) {
  const initialEligibleDonation =
    donations.find(
      (donation) =>
        donation.id === initialDonationId &&
        !initialReports.some(
          (report) =>
            report.donation_request_id === donation.id &&
            report.report_type === "pickup" &&
            report.is_completed,
        ),
    ) ||
    donations.find(
      (donation) =>
        !initialReports.some(
          (report) =>
            report.donation_request_id === donation.id &&
            report.report_type === "pickup" &&
            report.is_completed,
        ),
    );
  const [reports, setReports] = useState(initialReports);
  const [donationId, setDonationId] = useState(
    initialEligibleDonation?.id || "",
  );
  const initialInspectionState = inspectionStateForDonation(
    initialEligibleDonation?.id || "",
    donations,
    initialReports,
  );
  const [form, setForm] = useState<PickupInspectionData>(
    initialInspectionState.form,
  );
  const [expandedFields, setExpandedFields] = useState<
    Record<string, boolean>
  >({});
  const [notes, setNotes] = useState(initialInspectionState.notes);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [completedWorkOrder, setCompletedWorkOrder] = useState<string | null>(
    null,
  );
  const [validationErrors, setValidationErrors] = useState<Set<string>>(
    new Set(),
  );
  const [saving, setSaving] = useState(false);

  const selectedDonation = useMemo(
    () => donations.find((d) => d.id === donationId),
    [donations, donationId],
  );

  const incompleteDonations = useMemo(
    () =>
      donations.filter(
        (donation) =>
          !reports.some(
            (report) =>
              report.donation_request_id === donation.id &&
              report.report_type === "pickup" &&
              report.is_completed,
          ),
      ),
    [donations, reports],
  );

  const pickupReport = useMemo(
    () =>
      reports.find(
        (report) =>
          report.donation_request_id === donationId &&
          report.report_type === "pickup",
      ),
    [reports, donationId],
  );

  function selectDonation(id: string) {
    const state = inspectionStateForDonation(id, donations, reports);
    setDonationId(id);
    setForm(state.form);
    setNotes(state.notes);
    setError("");
    setMessage("");
    setValidationErrors(new Set());
    setExpandedFields({});
  }

  function toggleOptionalField(key: string, open: boolean) {
    setExpandedFields((current) => ({ ...current, [key]: open }));
  }

  function updateItem(
    key: string,
    patch: Partial<InspectionItemResult>,
  ) {
    setForm((current) => ({
      ...current,
      inspection_items: {
        ...current.inspection_items,
        [key]: {
          ...current.inspection_items[key],
          ...patch,
        },
      },
    }));
  }

  async function saveReport(completed: boolean) {
    if (!donationId) return;

    if (completed) {
      const missing: string[] = [];
      if (!form.pickup_date) missing.push("pickup_date");
      if (!form.pickup_time) missing.push("pickup_time");
      if (!form.pickup_location.trim()) missing.push("pickup_location");
      if (!form.goodwill_driver.trim()) missing.push("goodwill_driver");
      if (!form.weather_conditions.trim()) missing.push("weather_conditions");
      inspectionItems.forEach(([key]) => {
        if (form.inspection_items[key]?.result === "not_checked") {
          missing.push(`tow:${key}`);
        }
      });
      exteriorComponents.forEach(([key]) => {
        if (form.exterior_components[key]?.result === "not_checked") {
          missing.push(`exterior:${key}`);
        }
      });
      interiorItems.forEach(([key]) => {
        if (form.interior_items[key]?.result === "not_checked") {
          missing.push(`interior:${key}`);
        }
      });
      if (
        form.responsible_signer_present === "yes" &&
        !form.responsible_signer_signature.trim()
      ) {
        missing.push("responsible_signer_signature");
      }
      if (
        form.responsible_signer_present === "yes" &&
        !form.responsible_signer_signed_at
      ) {
        missing.push("responsible_signer_signed_at");
      }
      if (!form.driver_signature.trim()) missing.push("driver_signature");
      if (!form.driver_signed_at) missing.push("driver_signed_at");
      if (!form.acknowledgment_confirmed) {
        missing.push("acknowledgment_confirmed");
      }

      if (missing.length > 0) {
        setValidationErrors(new Set(missing));
        setError(
          `${missing.length} required field${missing.length === 1 ? " is" : "s are"} still missing. Highlighted items must be completed.`,
        );
        requestAnimationFrame(() => {
          document
            .getElementById(`field-${missing[0]}`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
        return;
      }
    }

    setSaving(true);
    setValidationErrors(new Set());
    setError("");
    setMessage("");

    const extras: PickupInspectionData = {
      ...form,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    };
    const outsideCondition =
      form.tow_readiness === "safe_to_tow"
        ? "good"
        : form.tow_readiness === "service_required"
          ? "fair"
          : "poor";

    const response = await fetch("/api/trailer-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        donation_request_id: donationId,
        report_type: "pickup",
        is_completed: completed,
        outside_condition: outsideCondition,
        submitted_by: form.goodwill_driver || null,
        notes: notes || null,
        extras,
      }),
    });
    const body = await response.json().catch(() => ({}));
    setSaving(false);

    if (!response.ok) {
      setError(body.error || "Failed to save report");
      return;
    }

    const saved = body as TrailerReport;
    setReports((current) => [
      saved,
      ...current.filter(
        (report) =>
          !(
            report.donation_request_id === saved.donation_request_id &&
            report.report_type === saved.report_type
          ),
      ),
    ]);
    setForm(extras);
    setMessage(completed ? "" : "Draft saved.");
    if (completed) {
      setCompletedWorkOrder(selectedDonation?.reference_code || "");
      const nextDonation = incompleteDonations.find(
        (donation) => donation.id !== donationId,
      );
      selectDonation(nextDonation?.id || "");
    }
  }

  return (
    <div className="space-y-6">
      {completedWorkOrder !== null && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-ink/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="completion-title"
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="bg-gw-blue-deep px-6 py-7 text-center text-white">
              <CheckCircle2
                className="mx-auto size-16"
                strokeWidth={2.25}
                aria-hidden="true"
              />
              <h2
                id="completion-title"
                className="mt-4 text-2xl font-bold text-white"
              >
                Pickup Report Completed
              </h2>
              {completedWorkOrder && (
                <p className="mt-2 text-lg font-semibold text-white/85">
                  Work Order #{completedWorkOrder}
                </p>
              )}
            </div>
            <div className="p-6 text-center">
              <p className="text-muted">
                The inspection has been saved and marked completed.
              </p>
              <button
                type="button"
                className="btn btn-primary mt-6 min-h-14 w-full text-lg"
                autoFocus
                onClick={() => setCompletedWorkOrder(null)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="panel overflow-hidden">
        <div className="bg-gw-blue-deep px-4 sm:px-6 py-4 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
              Good to Go
            </p>
            <h2 className="text-xl sm:text-2xl font-bold">
              Mobile Donation Center Pickup Inspection
            </h2>
          </div>
          <span
            className={`self-start rounded-full px-3 py-1.5 text-sm font-bold ${
              pickupReport?.is_completed
                ? "bg-white text-gw-blue-deep"
                : "bg-white/15 text-white"
            }`}
          >
            {pickupReport?.is_completed ? "Completed" : "Not completed"}
          </span>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <label className="block text-sm font-semibold">
              Incomplete pickup report
              <select
                className="select mt-1.5"
                value={donationId}
                onChange={(event) => {
                  selectDonation(event.target.value);
                }}
                disabled={incompleteDonations.length === 0}
              >
                {incompleteDonations.length === 0 ? (
                  <option value="">All pickup reports are completed</option>
                ) : (
                  incompleteDonations.map((donation) => (
                    <option key={donation.id} value={donation.id}>
                      #{donation.reference_code} — {fullName(donation)}
                    </option>
                  ))
                )}
              </select>
              {selectedDonation && (
                <p className="mt-2 text-sm text-muted">
                  {fullName(selectedDonation)}
                  {selectedDonation.organization
                    ? ` · ${selectedDonation.organization}`
                    : ""}
                </p>
              )}
            </label>
            <div className="rounded-lg border border-line bg-surface px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Trailer Unit / Plate
              </p>
              <p className="mt-1 font-bold">
                {selectedDonation?.trailers?.name || "No trailer assigned"}
              </p>
            </div>
          </div>

          {selectedDonation && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-gw-blue-soft p-3 text-sm">
              <span className="font-bold">#{selectedDonation.reference_code}</span>
              <span>{fullName(selectedDonation)}</span>
              <span className="text-muted">
                {selectedDonation.organization || selectedDonation.city || "—"}
              </span>
              <Link
                href="/staff/manage"
                className="ml-auto font-semibold text-gw-blue"
              >
                View in Manage Donations
              </Link>
            </div>
          )}

          <div
            id="field-estimated_load"
            className={`rounded-xl border p-4 sm:p-5 ${
              validationErrors.has("estimated_load")
                ? "border-red-500 bg-red-50"
                : "border-gw-blue/30 bg-gw-blue-soft/60"
            }`}
          >
            <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_auto]">
              <label className="block text-sm font-semibold">
                Estimated trailer fullness
                <select
                  className="select mt-1.5"
                  value={
                    LOAD_SIZES.includes(
                      form.estimated_load as LoadSize,
                    )
                      ? form.estimated_load
                      : "quarter"
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      estimated_load: event.target.value as LoadSize,
                      estimated_load_other: "",
                    })
                  }
                >
                  {loadSettings
                    .filter((setting) =>
                      LOAD_SIZES.includes(setting.load_size),
                    )
                    .sort(
                      (a, b) =>
                        Number(a.estimated_pounds) - Number(b.estimated_pounds),
                    )
                    .map((setting) => {
                      const estimate = calcLoadEstimate(
                        Number(setting.estimated_pounds),
                        Number(setting.value_per_pound),
                      );
                      return (
                        <option key={setting.load_size} value={setting.load_size}>
                          {setting.label || LOAD_SIZE_LABELS[setting.load_size]}{" "}
                          — {formatNumber(setting.estimated_pounds)} lbs ·{" "}
                          {formatCurrency(estimate.estimated_value)}
                        </option>
                      );
                    })}
                </select>
              </label>
              {(() => {
                const setting = loadSettings.find(
                  (item) => item.load_size === form.estimated_load,
                );
                if (!setting) return null;
                const estimate = calcLoadEstimate(
                  Number(setting.estimated_pounds),
                  Number(setting.value_per_pound),
                );
                return (
                  <div className="rounded-lg bg-white px-4 py-3 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Estimated value
                    </p>
                    <p className="mt-1 text-2xl font-bold text-gw-blue-deep">
                      {formatCurrency(estimate.estimated_value)}
                    </p>
                    <p className="mt-1 text-muted">
                      {formatNumber(setting.estimated_pounds)} lbs × $
                      {Number(setting.value_per_pound).toFixed(2)}
                      /lb
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <label
              id="field-pickup_date"
              className="block text-sm font-semibold"
            >
              Pickup date
              <input
                type="date"
                className={`input mt-1.5 ${validationErrors.has("pickup_date") ? "!border-red-500 !bg-red-50" : ""}`}
                value={form.pickup_date}
                onChange={(event) =>
                  setForm({ ...form, pickup_date: event.target.value })
                }
              />
            </label>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <label
                id="field-pickup_time"
                className="block text-sm font-semibold"
              >
                Pickup time
                <input
                  type="time"
                  className={`input mt-1.5 ${validationErrors.has("pickup_time") ? "!border-red-500 !bg-red-50" : ""}`}
                  value={form.pickup_time}
                  onChange={(event) =>
                    setForm({ ...form, pickup_time: event.target.value })
                  }
                />
              </label>
              <label className="block text-sm font-semibold">
                AM / PM
                <select
                  className="select mt-1.5"
                  value={form.pickup_period}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      pickup_period: event.target.value as "AM" | "PM",
                    })
                  }
                >
                  <option>AM</option>
                  <option>PM</option>
                </select>
              </label>
            </div>
            <label
              id="field-goodwill_driver"
              className="block text-sm font-semibold sm:col-span-2 lg:col-span-1"
            >
              Goodwill driver / inspector
              <input
                className={`input mt-1.5 ${validationErrors.has("goodwill_driver") ? "!border-red-500 !bg-red-50" : ""}`}
                value={form.goodwill_driver}
                onChange={(event) =>
                  setForm({ ...form, goodwill_driver: event.target.value })
                }
                placeholder="Driver name"
              />
            </label>
            <label
              id="field-pickup_location"
              className="block text-sm font-semibold sm:col-span-2"
            >
              Pickup location
              <input
                className={`input mt-1.5 ${validationErrors.has("pickup_location") ? "!border-red-500 !bg-red-50" : ""}`}
                value={form.pickup_location}
                onChange={(event) =>
                  setForm({ ...form, pickup_location: event.target.value })
                }
              />
            </label>
            <label
              id="field-weather_conditions"
              className="block text-sm font-semibold"
            >
              Weather / ground conditions
              <input
                className={`input mt-1.5 ${validationErrors.has("weather_conditions") ? "!border-red-500 !bg-red-50" : ""}`}
                value={form.weather_conditions}
                onChange={(event) =>
                  setForm({ ...form, weather_conditions: event.target.value })
                }
                placeholder="Dry, wet, muddy..."
              />
            </label>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-semibold">
                Responsible signer present?
              </p>
              <ChoiceGroup
                value={form.responsible_signer_present}
                options={[
                  {
                    value: "yes",
                    label: "Yes",
                    tone:
                      "border-emerald-600 bg-emerald-600 text-white",
                  },
                  {
                    value: "no",
                    label: "No",
                    tone: "border-red-600 bg-red-600 text-white",
                  },
                ]}
                onChange={(value) =>
                  setForm({ ...form, responsible_signer_present: value })
                }
              />
            </div>
            <div>
              <p className="text-sm font-semibold">Scheduled pickup?</p>
              <ChoiceGroup
                value={form.scheduled_pickup}
                options={[
                  {
                    value: "yes",
                    label: "Yes",
                    tone:
                      "border-emerald-600 bg-emerald-600 text-white",
                  },
                  {
                    value: "no",
                    label: "No",
                    tone: "border-red-600 bg-red-600 text-white",
                  },
                ]}
                onChange={(value) =>
                  setForm({ ...form, scheduled_pickup: value })
                }
              />
            </div>
            <div>
              <p className="text-sm font-semibold">48-hour notice issue?</p>
              <ChoiceGroup
                value={form.notice_issue}
                options={[
                  {
                    value: "na",
                    label: "N/A",
                    tone:
                      "border-slate-500 bg-slate-500 text-white",
                  },
                  {
                    value: "no",
                    label: "No",
                    tone:
                      "border-emerald-600 bg-emerald-600 text-white",
                  },
                  {
                    value: "yes",
                    label: "Yes",
                    tone: "border-red-600 bg-red-600 text-white",
                  },
                ]}
                onChange={(value) =>
                  setForm({ ...form, notice_issue: value })
                }
              />
            </div>
          </div>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-line px-4 sm:px-6 py-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gw-blue">
            Section 1
          </p>
          <h2 className="text-xl font-bold text-ink">
            Pickup Release & Tow-Readiness
          </h2>
        </div>

        <div className="p-4 sm:p-6">
          <div className="grid md:grid-cols-3 gap-2 mb-6">
            {[
              {
                value: "safe_to_tow" as const,
                label: "Safe to Tow",
                className:
                  "bg-emerald-600 text-white border-emerald-600",
              },
              {
                value: "service_required" as const,
                label: "Service Required Before Tow",
                className: "bg-amber-500 text-white border-amber-500",
              },
              {
                value: "do_not_tow" as const,
                label: "Do Not Tow / Escalate",
                className: "bg-red-600 text-white border-red-600",
              },
            ].map((choice) => (
              <button
                key={choice.value}
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    tow_readiness: choice.value as TowReadiness,
                  })
                }
                className={`min-h-14 rounded-lg border px-4 font-bold ${
                  form.tow_readiness === choice.value
                    ? choice.className
                    : "border-line bg-white text-muted"
                }`}
              >
                {choice.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {inspectionItems.map(([key, label], index) => {
              const item = form.inspection_items[key];
              return (
                <div
                  key={key}
                  id={`field-tow:${key}`}
                  className={`rounded-lg border p-5 sm:p-6 ${
                    validationErrors.has(`tow:${key}`)
                      ? "border-red-500 bg-red-50"
                      : "border-line"
                  }`}
                >
                  <div className="flex flex-col items-center gap-2 text-center">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gw-blue-soft text-xs font-bold text-gw-blue-deep">
                      {index + 1}
                    </span>
                    <p className="text-lg sm:text-xl font-bold leading-snug">
                      {label}
                    </p>
                  </div>
                  <div className="mt-4 space-y-4">
                    <ChoiceGroup<InspectionResult>
                      value={item?.result || "not_checked"}
                      options={[
                        {
                          value: "not_checked",
                          label: "Not checked",
                          tone:
                            "border-slate-500 bg-slate-500 text-white",
                        },
                        {
                          value: "ok",
                          label: "OK",
                          tone:
                            "border-emerald-600 bg-emerald-600 text-white",
                        },
                        {
                          value: "issue",
                          label: "Issue",
                          tone: "border-red-600 bg-red-600 text-white",
                        },
                      ]}
                      onChange={(value) => updateItem(key, { result: value })}
                    />
                    <OptionalDetails
                      id={`tow:${key}`}
                      donationId={donationId}
                      notes={item?.notes || ""}
                      photoReference={item?.photo_reference || ""}
                      expanded={expandedFields}
                      onToggle={toggleOptionalField}
                      onNotesChange={(value) =>
                        updateItem(key, { notes: value })
                      }
                      onPhotoChange={(value) =>
                        updateItem(key, { photo_reference: value })
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-line px-4 sm:px-6 py-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gw-blue">
            Section 2
          </p>
          <h2 className="text-xl font-bold text-ink">
            Exterior Condition — Mark New Damage
          </h2>
          <p className="mt-1 text-sm text-muted">
            Record the location and description of new damage. Include matching
            photo numbers where applicable.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-4 p-4 sm:p-6">
          {damageAreas.map(([key, label]) => (
            <label key={key} className="block text-sm font-semibold">
              {label}
              <textarea
                className="textarea mt-1.5 min-h-28"
                value={form.exterior_damage[key] || ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    exterior_damage: {
                      ...form.exterior_damage,
                      [key]: event.target.value,
                    },
                  })
                }
                placeholder="No new damage, or describe damage and photo #..."
              />
            </label>
          ))}
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-line px-4 sm:px-6 py-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gw-blue">
            Section 3
          </p>
          <h2 className="text-xl font-bold text-ink">
            Exterior Component Check
          </h2>
        </div>
        <div className="space-y-3 p-4 sm:p-6">
          {exteriorComponents.map(([key, label]) => {
            const component = form.exterior_components[key];
            return (
              <div
                key={key}
                id={`field-exterior:${key}`}
                className={`rounded-lg border p-4 ${
                  validationErrors.has(`exterior:${key}`)
                    ? "border-red-500 bg-red-50"
                    : "border-line"
                }`}
              >
                <p className="text-center text-lg sm:text-xl font-bold">
                  {label}
                </p>
                <div className="mt-4 space-y-4">
                  <ChoiceGroup
                    value={component.result}
                    options={[
                      {
                        value: "not_checked",
                        label: "Not checked",
                        tone:
                          "border-slate-500 bg-slate-500 text-white",
                      },
                      {
                        value: "no_change",
                        label: "No change",
                        tone:
                          "border-emerald-600 bg-emerald-600 text-white",
                      },
                      {
                        value: "new_damage",
                        label: "New damage",
                        tone: "border-red-600 bg-red-600 text-white",
                      },
                      {
                        value: "na",
                        label: "N/A",
                        tone:
                          "border-slate-500 bg-slate-500 text-white",
                      },
                    ]}
                    onChange={(value) =>
                      setForm({
                        ...form,
                        exterior_components: {
                          ...form.exterior_components,
                          [key]: { ...component, result: value },
                        },
                      })
                    }
                  />
                  <OptionalDetails
                    id={`exterior:${key}`}
                    donationId={donationId}
                    notes={component.notes}
                    photoReference={component.photo_reference}
                    expanded={expandedFields}
                    onToggle={toggleOptionalField}
                    onNotesChange={(value) =>
                      setForm({
                        ...form,
                        exterior_components: {
                          ...form.exterior_components,
                          [key]: { ...component, notes: value },
                        },
                      })
                    }
                    onPhotoChange={(value) =>
                      setForm({
                        ...form,
                        exterior_components: {
                          ...form.exterior_components,
                          [key]: {
                            ...component,
                            photo_reference: value,
                          },
                        },
                      })
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-line px-4 sm:px-6 py-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gw-blue">
            Section 4
          </p>
          <h2 className="text-xl font-bold text-ink">
            Interior, Donation Load & Cleanliness
          </h2>
        </div>
        <div className="space-y-3 p-4 sm:p-6">
          {interiorItems.map(([key, label]) => {
            const item = form.interior_items[key];
            return (
              <div
                key={key}
                id={`field-interior:${key}`}
                className={`rounded-lg border p-4 ${
                  validationErrors.has(`interior:${key}`)
                    ? "border-red-500 bg-red-50"
                    : "border-line"
                }`}
              >
                <p className="text-center text-lg sm:text-xl font-bold">
                  {label}
                </p>
                <div className="mt-4 space-y-4">
                  <ChoiceGroup<InspectionResult>
                    value={item.result}
                    options={[
                      {
                        value: "not_checked",
                        label: "Not checked",
                        tone:
                          "border-slate-500 bg-slate-500 text-white",
                      },
                      {
                        value: "ok",
                        label: "OK",
                        tone:
                          "border-emerald-600 bg-emerald-600 text-white",
                      },
                      {
                        value: "issue",
                        label: "Issue",
                        tone: "border-red-600 bg-red-600 text-white",
                      },
                    ]}
                    onChange={(value) =>
                      setForm({
                        ...form,
                        interior_items: {
                          ...form.interior_items,
                          [key]: { ...item, result: value },
                        },
                      })
                    }
                  />
                  <OptionalDetails
                    id={`interior:${key}`}
                    donationId={donationId}
                    notes={item.notes}
                    photoReference={item.photo_reference}
                    expanded={expandedFields}
                    onToggle={toggleOptionalField}
                    onNotesChange={(value) =>
                      setForm({
                        ...form,
                        interior_items: {
                          ...form.interior_items,
                          [key]: { ...item, notes: value },
                        },
                      })
                    }
                    onPhotoChange={(value) =>
                      setForm({
                        ...form,
                        interior_items: {
                          ...form.interior_items,
                          [key]: { ...item, photo_reference: value },
                        },
                      })
                    }
                  />
                </div>
              </div>
            );
          })}

          <div className="grid md:grid-cols-2 gap-4 rounded-lg bg-surface p-4">
            <div>
              <p className="text-sm font-semibold">
                Accepted-item exception or unsafe material found?
              </p>
              <ChoiceGroup
                value={form.accepted_item_exception}
                options={[
                  {
                    value: "no",
                    label: "No",
                    tone:
                      "border-emerald-600 bg-emerald-600 text-white",
                  },
                  {
                    value: "yes",
                    label: "Yes",
                    tone: "border-red-600 bg-red-600 text-white",
                  },
                ]}
                onChange={(value) =>
                  setForm({ ...form, accepted_item_exception: value })
                }
              />
            </div>
            <label className="block text-sm font-semibold">
              Exception details / action taken
              <input
                className="input mt-1.5"
                value={form.accepted_item_exception_details}
                onChange={(event) =>
                  setForm({
                    ...form,
                    accepted_item_exception_details: event.target.value,
                  })
                }
                placeholder="Isolate, photograph, supervisor contacted..."
              />
            </label>
          </div>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-line px-4 sm:px-6 py-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gw-blue">
            Section 5
          </p>
          <h2 className="text-xl font-bold text-ink">
            Loose Equipment / Accessory Inventory
          </h2>
        </div>
        <div className="space-y-3 p-4 sm:p-6">
          {equipmentItems.map(([key, label]) => {
            const item = form.equipment_inventory[key];
            return (
              <div
                key={key}
                className="grid sm:grid-cols-2 xl:grid-cols-[1.4fr_7rem_7rem_auto_1fr_9rem] gap-3 items-end rounded-lg border border-line p-4"
              >
                <p className="font-semibold sm:col-span-2 xl:col-span-1 xl:self-center">
                  {label}
                </p>
                <label className="text-xs font-semibold text-muted">
                  Qty Out
                  <input
                    inputMode="numeric"
                    className="input mt-1"
                    value={item.quantity_out}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        equipment_inventory: {
                          ...form.equipment_inventory,
                          [key]: {
                            ...item,
                            quantity_out: event.target.value,
                          },
                        },
                      })
                    }
                  />
                </label>
                <label className="text-xs font-semibold text-muted">
                  Qty In
                  <input
                    inputMode="numeric"
                    className="input mt-1"
                    value={item.quantity_in}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        equipment_inventory: {
                          ...form.equipment_inventory,
                          [key]: {
                            ...item,
                            quantity_in: event.target.value,
                          },
                        },
                      })
                    }
                  />
                </label>
                <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    className="size-5"
                    checked={item.missing_or_damaged}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        equipment_inventory: {
                          ...form.equipment_inventory,
                          [key]: {
                            ...item,
                            missing_or_damaged: event.target.checked,
                          },
                        },
                      })
                    }
                  />
                  Missing / damaged
                </label>
                <OptionalDetails
                  id={`equipment:${key}`}
                  donationId={donationId}
                  notes={item.notes}
                  photoReference={item.photo_reference}
                  expanded={expandedFields}
                  onToggle={toggleOptionalField}
                  onNotesChange={(value) =>
                    setForm({
                      ...form,
                      equipment_inventory: {
                        ...form.equipment_inventory,
                        [key]: { ...item, notes: value },
                      },
                    })
                  }
                  onPhotoChange={(value) =>
                    setForm({
                      ...form,
                      equipment_inventory: {
                        ...form.equipment_inventory,
                        [key]: { ...item, photo_reference: value },
                      },
                    })
                  }
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-line px-4 sm:px-6 py-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gw-blue">
            Section 6
          </p>
          <h2 className="text-xl font-bold text-ink">
            Damage / Exception Log & Photo Record
          </h2>
        </div>
        <div className="space-y-3 p-4 sm:p-6">
          {form.damage_log.map((entry, index) => (
            <div
              key={index}
              className="grid md:grid-cols-[3rem_12rem_1fr_1fr_9rem] gap-3 items-end rounded-lg border border-line p-4"
            >
              <span className="grid size-8 place-items-center rounded-full bg-gw-blue-soft font-bold text-gw-blue-deep">
                {index + 1}
              </span>
              <label className="text-xs font-semibold text-muted">
                Type
                <select
                  className="select mt-1"
                  value={entry.type}
                  onChange={(event) => {
                    const damageLog = [...form.damage_log];
                    damageLog[index] = {
                      ...entry,
                      type: event.target
                        .value as PickupInspectionData["damage_log"][number]["type"],
                    };
                    setForm({ ...form, damage_log: damageLog });
                  }}
                >
                  <option value="pre_existing">Pre-existing</option>
                  <option value="new">New</option>
                  <option value="missing">Missing</option>
                  <option value="load_issue">Load issue</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-muted">
                Location / description
                <input
                  className="input mt-1"
                  value={entry.description}
                  onChange={(event) => {
                    const damageLog = [...form.damage_log];
                    damageLog[index] = {
                      ...entry,
                      description: event.target.value,
                    };
                    setForm({ ...form, damage_log: damageLog });
                  }}
                />
              </label>
              <label className="text-xs font-semibold text-muted">
                Action taken
                <input
                  className="input mt-1"
                  value={entry.action_taken}
                  onChange={(event) => {
                    const damageLog = [...form.damage_log];
                    damageLog[index] = {
                      ...entry,
                      action_taken: event.target.value,
                    };
                    setForm({ ...form, damage_log: damageLog });
                  }}
                />
              </label>
              <div className="text-xs font-semibold text-muted sm:col-span-2 xl:col-span-1">
                Photo
                <div className="mt-1">
                  <ReportPhotoField
                    donationId={donationId}
                    fieldKey={`damage:${index}`}
                    value={entry.photo_reference}
                    onChange={(value) => {
                      const damageLog = [...form.damage_log];
                      damageLog[index] = {
                        ...entry,
                        photo_reference: value,
                      };
                      setForm({ ...form, damage_log: damageLog });
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-line px-4 sm:px-6 py-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gw-blue">
            Section 7
          </p>
          <h2 className="text-xl font-bold text-ink">
            Acknowledgment & Handoff
          </h2>
          <p className="mt-1 text-sm text-muted">
            Typed names serve as electronic signatures for this report.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-4 p-4 sm:p-6">
          <label
            id="field-responsible_signer_signature"
            className={`block rounded-lg text-sm font-semibold ${
              validationErrors.has("responsible_signer_signature")
                ? "bg-red-50 p-2 text-red-700"
                : ""
            }`}
          >
            Responsible signer signature
            <input
              className={`input mt-1.5 ${validationErrors.has("responsible_signer_signature") ? "!border-red-500" : ""}`}
              value={form.responsible_signer_signature}
              onChange={(event) =>
                setForm({
                  ...form,
                  responsible_signer_signature: event.target.value,
                })
              }
              placeholder="Type full name"
            />
          </label>
          <label
            id="field-responsible_signer_signed_at"
            className={`block rounded-lg text-sm font-semibold ${
              validationErrors.has("responsible_signer_signed_at")
                ? "bg-red-50 p-2 text-red-700"
                : ""
            }`}
          >
            Date / time
            <input
              type="datetime-local"
              className={`input mt-1.5 ${validationErrors.has("responsible_signer_signed_at") ? "!border-red-500" : ""}`}
              value={form.responsible_signer_signed_at}
              onChange={(event) =>
                setForm({
                  ...form,
                  responsible_signer_signed_at: event.target.value,
                })
              }
            />
          </label>
          <label
            id="field-driver_signature"
            className={`block rounded-lg text-sm font-semibold ${
              validationErrors.has("driver_signature")
                ? "bg-red-50 p-2 text-red-700"
                : ""
            }`}
          >
            Goodwill driver / inspector signature
            <input
              className={`input mt-1.5 ${validationErrors.has("driver_signature") ? "!border-red-500" : ""}`}
              value={form.driver_signature}
              onChange={(event) =>
                setForm({ ...form, driver_signature: event.target.value })
              }
              placeholder="Type full name"
            />
          </label>
          <label
            id="field-driver_signed_at"
            className={`block rounded-lg text-sm font-semibold ${
              validationErrors.has("driver_signed_at")
                ? "bg-red-50 p-2 text-red-700"
                : ""
            }`}
          >
            Date / time
            <input
              type="datetime-local"
              className={`input mt-1.5 ${validationErrors.has("driver_signed_at") ? "!border-red-500" : ""}`}
              value={form.driver_signed_at}
              onChange={(event) =>
                setForm({ ...form, driver_signed_at: event.target.value })
              }
            />
          </label>
          <label className="block text-sm font-semibold">
            Supervisor contacted (if applicable)
            <input
              className="input mt-1.5"
              value={form.supervisor_contacted}
              onChange={(event) =>
                setForm({ ...form, supervisor_contacted: event.target.value })
              }
              placeholder="Supervisor name"
            />
          </label>
          <label className="block text-sm font-semibold">
            Time / direction received
            <input
              type="datetime-local"
              className="input mt-1.5"
              value={form.supervisor_contacted_at}
              onChange={(event) =>
                setForm({
                  ...form,
                  supervisor_contacted_at: event.target.value,
                })
              }
            />
          </label>
          <label className="block text-sm font-semibold md:col-span-2">
            Supervisor direction
            <input
              className="input mt-1.5"
              value={form.supervisor_direction}
              onChange={(event) =>
                setForm({ ...form, supervisor_direction: event.target.value })
              }
            />
          </label>
          <label
            id="field-acknowledgment_confirmed"
            className={`flex items-start gap-3 rounded-lg p-4 md:col-span-2 ${
              validationErrors.has("acknowledgment_confirmed")
                ? "border border-red-500 bg-red-50 text-red-700"
                : "bg-gw-blue-soft"
            }`}
          >
            <input
              type="checkbox"
              className="mt-0.5 size-5 shrink-0"
              checked={form.acknowledgment_confirmed}
              onChange={(event) =>
                setForm({
                  ...form,
                  acknowledgment_confirmed: event.target.checked,
                })
              }
            />
            <span className="text-sm font-semibold">
              The responsible signer and Goodwill representative reviewed the
              trailer condition, equipment, donation load, and noted exceptions.
            </span>
          </label>
          <div className="rounded-lg border border-gw-blue/20 bg-gw-blue-soft p-4 text-sm text-gw-blue-deep md:col-span-2">
            <strong>Photo standard:</strong> Take clear pickup photos of all four
            exterior sides, hitch/tongue, tires/wheels, roofline if safely
            visible, open-door interior/load, loose equipment, and every damage
            or exception. Do not climb on the trailer.
          </div>
        </div>
      </section>

      <section className="panel p-4 sm:p-6">
        <label className="block text-sm font-semibold">
          Additional notes
          <textarea
            className="textarea mt-1.5 min-h-28"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-4 rounded-lg bg-gw-blue-soft p-3 text-sm font-semibold text-gw-blue-deep">
            {message}
          </p>
        )}

        <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            className="btn btn-secondary min-h-12"
            disabled={saving || !donationId}
            onClick={() => saveReport(false)}
          >
            Save as Draft
          </button>
          <button
            type="button"
            className="btn btn-primary min-h-12"
            disabled={saving || !donationId}
            onClick={() => saveReport(true)}
          >
            {saving ? "Saving…" : "Complete Pickup Report"}
          </button>
        </div>
      </section>

    </div>
  );
}
