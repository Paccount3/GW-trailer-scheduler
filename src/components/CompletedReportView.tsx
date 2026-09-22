import Link from "next/link";
import { ReportPhotoLink } from "@/components/ReportPhotoField";
import {
  DonationRequest,
  LOAD_SIZE_LABELS,
  LoadSize,
  PickupInspectionData,
  TrailerReport,
  fullName,
} from "@/lib/types";
import { formatDate } from "@/lib/utils";

const towItems: Array<[string, string]> = [
  ["access_route", "Access route clear"],
  ["placement", "Trailer remained in approved placement"],
  ["coupler", "Coupler, chains and breakaway system"],
  ["tongue_jack", "Tongue jack"],
  ["tires", "Tires"],
  ["wheels", "Wheels, lug nuts, fenders and axles"],
  ["doors", "Doors and latches"],
  ["lights", "Lights, reflectors and license plate"],
  ["load", "Load stability"],
  ["hazards", "Leaks, odors, pests or hazards"],
];

const exteriorItems: Array<[string, string]> = [
  ["body", "Body panels / roof / corners"],
  ["doors", "Doors / hinges / latches / seals"],
  ["coupler", "Coupler / chains / breakaway system"],
  ["jack", "Jack / tongue / frame"],
  ["tires", "Tires / wheels / fenders"],
  ["lights", "Lights / wiring / reflectors"],
  ["branding", "Branding / decals / signage"],
  ["license", "License plate / registration holder"],
];

const interiorItems: Array<[string, string]> = [
  ["surfaces", "Interior surfaces free of new damage"],
  ["water", "No water intrusion"],
  ["pests", "No mold, insects or infestation"],
  ["trash", "No trash or non-salable materials"],
  ["hazmat", "No hazardous waste"],
  ["mattresses", "No mattresses, appliances or building materials"],
  ["weapons", "No prohibited large or dangerous items"],
  ["condition", "Donations clean and working"],
  ["capacity", "Load below safe capacity"],
  ["clearance", "Interior clear for safe unloading"],
];

const equipmentItems: Array<[string, string]> = [
  ["keys", "Keys / Goodwill locks"],
  ["wheel_chocks", "Wheel chocks"],
  ["straps", "Load bars / straps / tie-downs"],
  ["jack_accessories", "Jack handle / stabilizer accessories"],
  ["broom", "Broom / dustpan"],
  ["donor_guide", "Donor guide / operating signage"],
  ["spare_tire", "Spare tire / tire accessory"],
  ["other", "Other"],
];

function valueLabel(value: string | undefined) {
  if (!value) return "—";
  if (value in LOAD_SIZE_LABELS) {
    return LOAD_SIZE_LABELS[value as LoadSize];
  }
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ResultRows({
  items,
  values,
}: {
  items: Array<[string, string]>;
  values:
    | PickupInspectionData["inspection_items"]
    | PickupInspectionData["exterior_components"]
    | PickupInspectionData["interior_items"]
    | undefined;
}) {
  return (
    <div className="divide-y divide-line">
      {items.map(([key, label]) => {
        const item = values?.[key];
        return (
          <div
            key={key}
            className="grid sm:grid-cols-[1fr_auto] gap-2 px-4 sm:px-6 py-3"
          >
            <span className="font-semibold">{label}</span>
            <span className="font-bold text-gw-blue-deep">
              {valueLabel(item?.result)}
            </span>
            {(item?.notes || item?.photo_reference) && (
              <div className="sm:col-span-2 space-y-2">
                {item.notes && (
                  <p className="text-sm text-muted">{item.notes}</p>
                )}
                <ReportPhotoLink path={item.photo_reference} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function CompletedReportView({
  report,
  donation,
}: {
  report: TrailerReport;
  donation: DonationRequest;
}) {
  const form = report.extras as Partial<PickupInspectionData>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-gw-blue">
            Work Order #{donation.reference_code}
          </p>
          <h1 className="text-3xl font-bold">Completed Pickup Report</h1>
          <p className="mt-1 text-muted">
            {fullName(donation)} · Completed{" "}
            {formatDate(report.completed_at || report.updated_at)}
          </p>
        </div>
        <Link href="/staff/manage" className="btn btn-secondary">
          Back to Manage Donations
        </Link>
      </div>

      <section className="panel overflow-hidden">
        <div className="bg-gw-blue-deep px-4 sm:px-6 py-4 text-white">
          <h2 className="text-xl font-bold text-white">
            Pickup Details
          </h2>
        </div>
        <dl className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 sm:p-6">
          {[
            ["Trailer", donation.trailers?.name || "Unassigned"],
            ["Pickup date", form.pickup_date || "—"],
            [
              "Pickup time",
              `${form.pickup_time || "—"} ${form.pickup_period || ""}`,
            ],
            ["Driver / inspector", form.goodwill_driver || "—"],
            ["Pickup location", form.pickup_location || "—"],
            ["Weather / ground", form.weather_conditions || "—"],
            [
              "Responsible signer present",
              valueLabel(form.responsible_signer_present),
            ],
            ["Scheduled pickup", valueLabel(form.scheduled_pickup)],
            ["48-hour notice issue", valueLabel(form.notice_issue)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                {label}
              </dt>
              <dd className="mt-1 font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-line px-4 sm:px-6 py-4">
          <h2 className="text-xl font-bold">1. Tow-Readiness</h2>
          <p className="mt-1 font-bold text-gw-blue-deep">
            {valueLabel(form.tow_readiness)}
          </p>
        </div>
        <ResultRows items={towItems} values={form.inspection_items} />
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-line px-4 sm:px-6 py-4">
          <h2 className="text-xl font-bold">2. Exterior Condition</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4 p-4 sm:p-6">
          {Object.entries(form.exterior_damage || {}).map(([area, details]) => (
            <div key={area} className="rounded-lg bg-surface p-3">
              <p className="font-semibold">{valueLabel(area)}</p>
              <p className="mt-1 text-sm text-muted">{details || "No new damage"}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-line px-4 sm:px-6 py-4">
          <h2 className="text-xl font-bold">3. Exterior Components</h2>
        </div>
        <ResultRows items={exteriorItems} values={form.exterior_components} />
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-line px-4 sm:px-6 py-4">
          <h2 className="text-xl font-bold">
            4. Interior, Donation Load & Cleanliness
          </h2>
          <p className="mt-1 text-sm text-muted">
            Estimated load:{" "}
            <strong className="text-ink">
              {form.estimated_load === "other"
                ? form.estimated_load_other || "Other"
                : valueLabel(form.estimated_load)}
            </strong>
          </p>
        </div>
        <ResultRows items={interiorItems} values={form.interior_items} />
        <div className="border-t border-line p-4 sm:px-6 text-sm">
          Unsafe-item exception:{" "}
          <strong>{valueLabel(form.accepted_item_exception)}</strong>
          {form.accepted_item_exception_details
            ? ` — ${form.accepted_item_exception_details}`
            : ""}
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-line px-4 sm:px-6 py-4">
          <h2 className="text-xl font-bold">5. Equipment Inventory</h2>
        </div>
        <div className="divide-y divide-line">
          {equipmentItems.map(([key, label]) => {
            const item = form.equipment_inventory?.[key];
            return (
              <div
                key={key}
                className="grid sm:grid-cols-[1fr_auto_auto] gap-2 px-4 sm:px-6 py-3"
              >
                <span className="font-semibold">{label}</span>
                <span>Out: {item?.quantity_out || "—"}</span>
                <span>In: {item?.quantity_in || "—"}</span>
                {(item?.missing_or_damaged ||
                  item?.notes ||
                  item?.photo_reference) && (
                  <div className="sm:col-span-3 space-y-2">
                    <p className="text-sm text-muted">
                      {item.missing_or_damaged ? "Missing/damaged. " : ""}
                      {item.notes}
                    </p>
                    <ReportPhotoLink path={item.photo_reference} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-line px-4 sm:px-6 py-4">
          <h2 className="text-xl font-bold">
            6. Damage / Exception Log
          </h2>
        </div>
        <div className="divide-y divide-line">
          {(form.damage_log || []).map((entry, index) => (
            <div key={index} className="px-4 sm:px-6 py-3">
              <p className="font-semibold">
                #{index + 1} · {valueLabel(entry.type)}
              </p>
              <p className="text-sm text-muted">
                {entry.description || "No entry"}
                {entry.action_taken ? ` · Action: ${entry.action_taken}` : ""}
              </p>
              <ReportPhotoLink path={entry.photo_reference} />
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-4 sm:p-6">
        <h2 className="text-xl font-bold">7. Acknowledgment & Handoff</h2>
        <dl className="mt-4 grid sm:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-muted">Responsible signer</dt>
            <dd className="font-semibold">
              {form.responsible_signer_signature || "Not present"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Driver / inspector</dt>
            <dd className="font-semibold">{form.driver_signature || "—"}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Supervisor contacted</dt>
            <dd className="font-semibold">
              {form.supervisor_contacted || "Not applicable"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Supervisor direction</dt>
            <dd className="font-semibold">
              {form.supervisor_direction || "—"}
            </dd>
          </div>
        </dl>
        {report.notes && (
          <div className="mt-5 rounded-lg bg-surface p-4">
            <p className="text-sm font-semibold">Additional notes</p>
            <p className="mt-1 text-sm text-muted">{report.notes}</p>
          </div>
        )}
      </section>
    </div>
  );
}
