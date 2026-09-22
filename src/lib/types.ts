export const DONATION_STATUSES = [
  "requested",
  "scheduled",
  "trailer_on_site",
  "ready_for_pickup",
  "completed",
  "cancelled",
] as const;

export type DonationStatus = (typeof DONATION_STATUSES)[number];

export const ACTIVE_TRAILER_STATUSES: DonationStatus[] = [
  "scheduled",
  "trailer_on_site",
  "ready_for_pickup",
];

export const CONDITION_RATINGS = ["poor", "fair", "good"] as const;
export type ConditionRating = (typeof CONDITION_RATINGS)[number];

export const REPORT_TYPES = ["dropoff", "pickup"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const LOAD_SIZES = [
  "quarter",
  "half",
  "three_quarter",
  "full",
] as const;
export type LoadSize = (typeof LOAD_SIZES)[number];

export const LOAD_SIZE_LABELS: Record<LoadSize, string> = {
  quarter: "25% Full",
  half: "50% Full",
  three_quarter: "75% Full",
  full: "100% Full",
};

/** Canonical trailer fullness defaults used by Settings and Trailer Reports. */
export const DEFAULT_LOAD_VALUE_SETTINGS: Array<{
  load_size: LoadSize;
  label: string;
  estimated_pounds: number;
  value_per_pound: number;
}> = [
  {
    load_size: "quarter",
    label: "25% Full",
    estimated_pounds: 1000,
    value_per_pound: 0.26,
  },
  {
    load_size: "half",
    label: "50% Full",
    estimated_pounds: 2000,
    value_per_pound: 0.26,
  },
  {
    load_size: "three_quarter",
    label: "75% Full",
    estimated_pounds: 3000,
    value_per_pound: 0.26,
  },
  {
    load_size: "full",
    label: "100% Full",
    estimated_pounds: 4000,
    value_per_pound: 0.26,
  },
];

export const STATUS_LABELS: Record<DonationStatus, string> = {
  requested: "Requested",
  scheduled: "Scheduled",
  trailer_on_site: "Trailer On-Site",
  ready_for_pickup: "Ready for Pickup",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Goodwill store / yard locations where trailers are staged for drop-off. */
export const DROPOFF_STORES = [
  "Avon",
  "Bloomfield",
  "Bridgeport",
  "Brookfield",
  "Danbury",
  "Enfield",
  "Fairfield",
  "Glastonbury",
  "Manchester",
  "Milford",
  "Monroe",
  "New Milford",
  "Norwalk",
  "Oxford",
  "Shelton",
  "Stamford – Broad",
  "Stamford – Elm",
  "Torrington",
  "Transportation",
  "Waterbury",
  "Westport",
] as const;

export type DropoffStore = (typeof DROPOFF_STORES)[number];

export type Trailer = {
  id: string;
  name: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type DonationRequest = {
  id: string;
  reference_code: string;
  wufoo_entry_id: string | null;
  first_name: string;
  last_name: string;
  organization: string | null;
  address_type: "residential" | "organization" | null;
  dropoff_town: string | null;
  phone: string | null;
  email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  requested_days: string | null;
  requested_duration_days: number | null;
  parking_location_description: string | null;
  parking_photo_path: string | null;
  license_photo_path: string | null;
  heard_about: string | null;
  signature: string | null;
  signed_at: string | null;
  agreement_version: string | null;
  staff_signer_name: string | null;
  staff_signature: string | null;
  staff_signed_at: string | null;
  hold_harmless: boolean | null;
  agreements: Record<string, unknown> | null;
  raw_wufoo_payload: Record<string, unknown> | null;
  status: DonationStatus;
  trailer_id: string | null;
  scheduled_date: string | null;
  dropoff_store: string | null;
  load_size: LoadSize | null;
  estimated_pounds: number | null;
  estimated_value: number | null;
  staff_notes: string | null;
  created_at: string;
  updated_at: string;
  trailers?: Trailer | null;
};

export type TrailerReport = {
  id: string;
  donation_request_id: string;
  report_type: ReportType;
  is_completed: boolean;
  completed_at: string | null;
  outside_condition: ConditionRating | null;
  notes: string | null;
  submitted_by: string | null;
  extras: PickupInspectionData | Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  donation_requests?: Pick<
    DonationRequest,
    "id" | "reference_code" | "first_name" | "last_name" | "organization" | "status"
  > | null;
};

export type InspectionResult = "ok" | "issue" | "not_checked";
export type TowReadiness =
  | "safe_to_tow"
  | "service_required"
  | "do_not_tow";

export type InspectionItemResult = {
  result: InspectionResult;
  notes: string;
  photo_reference: string;
};

export type PickupInspectionData = {
  completed: boolean;
  completed_at: string | null;
  pickup_date: string;
  pickup_time: string;
  pickup_period: "AM" | "PM";
  pickup_location: string;
  responsible_signer_present: "yes" | "no";
  goodwill_driver: string;
  scheduled_pickup: "yes" | "no";
  notice_issue: "yes" | "no" | "na";
  weather_conditions: string;
  tow_readiness: TowReadiness;
  inspection_items: Record<string, InspectionItemResult>;
  exterior_damage: Record<string, string>;
  exterior_components: Record<
    string,
    {
      result: "not_checked" | "no_change" | "new_damage" | "na";
      notes: string;
      photo_reference: string;
    }
  >;
  interior_items: Record<
    string,
    {
      result: InspectionResult;
      notes: string;
      photo_reference: string;
    }
  >;
  estimated_load: LoadSize | "other";
  estimated_load_other: string;
  accepted_item_exception: "yes" | "no";
  accepted_item_exception_details: string;
  equipment_inventory: Record<
    string,
    {
      quantity_out: string;
      quantity_in: string;
      missing_or_damaged: boolean;
      notes: string;
      photo_reference: string;
    }
  >;
  damage_log: Array<{
    type: "pre_existing" | "new" | "missing" | "load_issue";
    description: string;
    action_taken: string;
    photo_reference: string;
  }>;
  responsible_signer_signature: string;
  responsible_signer_signed_at: string;
  driver_signature: string;
  driver_signed_at: string;
  supervisor_contacted: string;
  supervisor_contacted_at: string;
  supervisor_direction: string;
  acknowledgment_confirmed: boolean;
};

export type LoadValueSetting = {
  id: string;
  load_size: LoadSize;
  label: string;
  estimated_pounds: number;
  value_per_pound: number;
  updated_at: string;
};

export function calcLoadEstimate(
  pounds: number,
  valuePerPound: number,
): { estimated_pounds: number; estimated_value: number } {
  return {
    estimated_pounds: pounds,
    estimated_value: Math.round(pounds * valuePerPound * 100) / 100,
  };
}

export function fullName(d: Pick<DonationRequest, "first_name" | "last_name">) {
  return `${d.first_name} ${d.last_name}`.trim();
}
