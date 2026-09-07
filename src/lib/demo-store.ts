import {
  ACTIVE_TRAILER_STATUSES,
  DonationRequest,
  DonationStatus,
  LoadSize,
  LoadValueSetting,
  Trailer,
  TrailerReport,
  calcLoadEstimate,
} from "@/lib/types";

const now = () => new Date().toISOString();

function uid() {
  return crypto.randomUUID();
}

const defaultLoadSettings: LoadValueSetting[] = [
  {
    id: "ls-quarter",
    load_size: "quarter",
    label: "1/4 Trailer",
    estimated_pounds: 250,
    value_per_pound: 1.5,
    updated_at: now(),
  },
  {
    id: "ls-third",
    load_size: "third",
    label: "1/3 Trailer",
    estimated_pounds: 350,
    value_per_pound: 1.5,
    updated_at: now(),
  },
  {
    id: "ls-half",
    load_size: "half",
    label: "1/2 Trailer",
    estimated_pounds: 500,
    value_per_pound: 1.5,
    updated_at: now(),
  },
  {
    id: "ls-three-quarter",
    load_size: "three_quarter",
    label: "3/4 Trailer",
    estimated_pounds: 750,
    value_per_pound: 1.5,
    updated_at: now(),
  },
  {
    id: "ls-full",
    load_size: "full",
    label: "Full Trailer",
    estimated_pounds: 1000,
    value_per_pound: 1.5,
    updated_at: now(),
  },
];

type Store = {
  trailers: Trailer[];
  donations: DonationRequest[];
  reports: TrailerReport[];
  loadSettings: LoadValueSetting[];
};

declare global {
  var __gtgDemoStore: Store | undefined;
}

function seedStore(): Store {
  const t1: Trailer = {
    id: "trailer-1",
    name: "Trailer A",
    notes: "Main community trailer",
    is_active: true,
    created_at: now(),
    updated_at: now(),
  };
  const t2: Trailer = {
    id: "trailer-2",
    name: "Trailer B",
    notes: "Backup / overflow",
    is_active: true,
    created_at: now(),
    updated_at: now(),
  };
  const t3: Trailer = {
    id: "trailer-3",
    name: "Trailer C",
    notes: null,
    is_active: true,
    created_at: now(),
    updated_at: now(),
  };

  const donations: DonationRequest[] = [
    {
      id: "don-1",
      reference_code: "1001",
      wufoo_entry_id: "wufoo-101",
      first_name: "Maria",
      last_name: "Lopez",
      organization: "Lopez Family",
      address_type: "residential",
      dropoff_town: "Bethel",
      phone: "555-0101",
      email: "maria@example.com",
      address_line1: "12 Oak Street",
      address_line2: null,
      city: "Springfield",
      state: "IL",
      zip: "62701",
      requested_days: "Week of Sept 15",
      requested_duration_days: 3,
      parking_location_description: "Flat driveway on the left side.",
      parking_photo_path: null,
      license_photo_path: null,
      heard_about: "Social media",
      signature: "Maria Lopez",
      signed_at: now(),
      agreement_version: "2026-09-07",
      hold_harmless: true,
      agreements: { liability: true },
      raw_wufoo_payload: null,
      status: "scheduled",
      trailer_id: t1.id,
      scheduled_date: "2026-09-16",
      load_size: "half",
      estimated_pounds: 500,
      estimated_value: 750,
      staff_notes: "Driveway access on left side",
      created_at: now(),
      updated_at: now(),
    },
    {
      id: "don-2",
      reference_code: "1002",
      wufoo_entry_id: "wufoo-102",
      first_name: "James",
      last_name: "Chen",
      organization: "Chen Estate Sale",
      address_type: "organization",
      dropoff_town: "Darien",
      phone: "555-0102",
      email: "james@example.com",
      address_line1: "88 Maple Ave",
      address_line2: "Unit B",
      city: "Springfield",
      state: "IL",
      zip: "62702",
      requested_days: "Anytime next week",
      requested_duration_days: 2,
      parking_location_description: "Rear parking lot.",
      parking_photo_path: null,
      license_photo_path: null,
      heard_about: "Goodwill website",
      signature: "James Chen",
      signed_at: now(),
      agreement_version: "2026-09-07",
      hold_harmless: true,
      agreements: { liability: true },
      raw_wufoo_payload: null,
      status: "requested",
      trailer_id: null,
      scheduled_date: null,
      load_size: null,
      estimated_pounds: null,
      estimated_value: null,
      staff_notes: null,
      created_at: now(),
      updated_at: now(),
    },
    {
      id: "don-3",
      reference_code: "1003",
      wufoo_entry_id: "wufoo-103",
      first_name: "Priya",
      last_name: "Patel",
      organization: null,
      address_type: "residential",
      dropoff_town: "Fairfield",
      phone: "555-0103",
      email: "priya@example.com",
      address_line1: "401 Lake Road",
      address_line2: null,
      city: "Springfield",
      state: "IL",
      zip: "62703",
      requested_days: "Sept 20–22",
      requested_duration_days: 3,
      parking_location_description: "Gravel pad beside garage.",
      parking_photo_path: null,
      license_photo_path: null,
      heard_about: "Friend or family",
      signature: "Priya Patel",
      signed_at: now(),
      agreement_version: "2026-09-07",
      hold_harmless: true,
      agreements: { liability: true },
      raw_wufoo_payload: null,
      status: "trailer_on_site",
      trailer_id: t2.id,
      scheduled_date: "2026-09-12",
      load_size: "full",
      estimated_pounds: 1000,
      estimated_value: 1500,
      staff_notes: "Large furniture expected",
      created_at: now(),
      updated_at: now(),
    },
    {
      id: "don-4",
      reference_code: "1004",
      wufoo_entry_id: "wufoo-104",
      first_name: "Chris",
      last_name: "Nguyen",
      organization: "Nguyen Household",
      address_type: "residential",
      dropoff_town: "Westport",
      phone: "555-0104",
      email: "chris@example.com",
      address_line1: "9 Birch Lane",
      address_line2: null,
      city: "Springfield",
      state: "IL",
      zip: "62704",
      requested_days: "Flexible",
      requested_duration_days: 2,
      parking_location_description: "Street in front of home.",
      parking_photo_path: null,
      license_photo_path: null,
      heard_about: "Social media",
      signature: "Chris Nguyen",
      signed_at: now(),
      agreement_version: "2026-09-07",
      hold_harmless: true,
      agreements: { liability: true },
      raw_wufoo_payload: null,
      status: "completed",
      trailer_id: null,
      scheduled_date: "2026-08-28",
      load_size: "three_quarter",
      estimated_pounds: 750,
      estimated_value: 1125,
      staff_notes: "Completed successfully",
      created_at: now(),
      updated_at: now(),
    },
  ];

  const reports: TrailerReport[] = [
    {
      id: "rep-1",
      donation_request_id: "don-3",
      report_type: "dropoff",
      is_completed: true,
      completed_at: now(),
      outside_condition: "good",
      notes: "Parked on gravel pad",
      submitted_by: "Driver Sam",
      extras: {},
      created_at: now(),
      updated_at: now(),
    },
  ];

  return {
    trailers: [t1, t2, t3],
    donations,
    reports,
    loadSettings: defaultLoadSettings,
  };
}

function getStore(): Store {
  if (!globalThis.__gtgDemoStore) {
    globalThis.__gtgDemoStore = seedStore();
  }
  return globalThis.__gtgDemoStore;
}

function withTrailer(d: DonationRequest): DonationRequest {
  const trailer = getStore().trailers.find((t) => t.id === d.trailer_id) || null;
  return { ...d, trailers: trailer };
}

function withDonation(r: TrailerReport): TrailerReport {
  const donation = getStore().donations.find((d) => d.id === r.donation_request_id);
  return {
    ...r,
    donation_requests: donation
      ? {
          id: donation.id,
          reference_code: donation.reference_code,
          first_name: donation.first_name,
          last_name: donation.last_name,
          organization: donation.organization,
          status: donation.status,
        }
      : null,
  };
}

function applyLoadSize(donation: DonationRequest, loadSize: LoadSize | null) {
  if (!loadSize) {
    donation.load_size = null;
    donation.estimated_pounds = null;
    donation.estimated_value = null;
    return;
  }
  const setting = getStore().loadSettings.find((s) => s.load_size === loadSize);
  donation.load_size = loadSize;
  if (setting) {
    const est = calcLoadEstimate(
      Number(setting.estimated_pounds),
      Number(setting.value_per_pound),
    );
    donation.estimated_pounds = est.estimated_pounds;
    donation.estimated_value = est.estimated_value;
  }
}

function assertTrailerAvailable(
  trailerId: string | null | undefined,
  status: DonationStatus,
  excludeDonationId?: string,
) {
  if (!trailerId) return;
  if (!ACTIVE_TRAILER_STATUSES.includes(status)) return;

  const conflict = getStore().donations.find(
    (d) =>
      d.id !== excludeDonationId &&
      d.trailer_id === trailerId &&
      ACTIVE_TRAILER_STATUSES.includes(d.status),
  );

  if (conflict) {
    throw new Error(
      `Trailer is already assigned to ${conflict.reference_code} (${conflict.status}).`,
    );
  }
}

export const demoDb = {
  listTrailers() {
    return [...getStore().trailers].sort((a, b) => a.name.localeCompare(b.name));
  },

  createTrailer(input: { name: string; notes?: string | null; is_active?: boolean }) {
    const trailer: Trailer = {
      id: uid(),
      name: input.name.trim(),
      notes: input.notes ?? null,
      is_active: input.is_active ?? true,
      created_at: now(),
      updated_at: now(),
    };
    getStore().trailers.push(trailer);
    return trailer;
  },

  updateTrailer(
    id: string,
    patch: Partial<Pick<Trailer, "name" | "notes" | "is_active">>,
  ) {
    const trailer = getStore().trailers.find((t) => t.id === id);
    if (!trailer) throw new Error("Trailer not found");
    Object.assign(trailer, patch, { updated_at: now() });
    return trailer;
  },

  deleteTrailer(id: string) {
    const store = getStore();
    const active = store.donations.find(
      (d) => d.trailer_id === id && ACTIVE_TRAILER_STATUSES.includes(d.status),
    );
    if (active) {
      throw new Error(
        `Cannot remove trailer while assigned to ${active.reference_code}.`,
      );
    }
    store.trailers = store.trailers.filter((t) => t.id !== id);
    store.donations.forEach((d) => {
      if (d.trailer_id === id) d.trailer_id = null;
    });
  },

  listDonations() {
    return getStore()
      .donations.map(withTrailer)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  getDonation(id: string) {
    const d = getStore().donations.find((x) => x.id === id);
    return d ? withTrailer(d) : null;
  },

  createDonation(
    input: Partial<DonationRequest> &
      Pick<DonationRequest, "first_name" | "last_name">,
  ) {
    const donation: DonationRequest = {
      id: uid(),
      reference_code:
        input.reference_code ||
        String(
          Math.max(
            1000,
            ...getStore().donations.map((d) => Number(d.reference_code) || 0),
          ) + 1,
        ),
      wufoo_entry_id: input.wufoo_entry_id ?? null,
      first_name: input.first_name,
      last_name: input.last_name,
      organization: input.organization ?? null,
      address_type: input.address_type ?? null,
      dropoff_town: input.dropoff_town ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      address_line1: input.address_line1 ?? null,
      address_line2: input.address_line2 ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      zip: input.zip ?? null,
      requested_days: input.requested_days ?? null,
      requested_duration_days: input.requested_duration_days ?? null,
      parking_location_description:
        input.parking_location_description ?? null,
      parking_photo_path: input.parking_photo_path ?? null,
      license_photo_path: input.license_photo_path ?? null,
      heard_about: input.heard_about ?? null,
      signature: input.signature ?? null,
      signed_at: input.signed_at ?? null,
      agreement_version: input.agreement_version ?? null,
      hold_harmless: input.hold_harmless ?? false,
      agreements: input.agreements ?? {},
      raw_wufoo_payload: input.raw_wufoo_payload ?? null,
      status: input.status ?? "requested",
      trailer_id: input.trailer_id ?? null,
      scheduled_date: input.scheduled_date ?? null,
      load_size: null,
      estimated_pounds: null,
      estimated_value: null,
      staff_notes: input.staff_notes ?? null,
      created_at: now(),
      updated_at: now(),
    };

    assertTrailerAvailable(donation.trailer_id, donation.status);
    if (input.load_size) applyLoadSize(donation, input.load_size);

    getStore().donations.unshift(donation);
    return withTrailer(donation);
  },

  updateDonation(
    id: string,
    patch: Partial<
      Pick<
        DonationRequest,
        | "status"
        | "trailer_id"
        | "scheduled_date"
        | "load_size"
        | "staff_notes"
        | "first_name"
        | "last_name"
        | "organization"
        | "phone"
        | "email"
      >
    >,
  ) {
    const donation = getStore().donations.find((d) => d.id === id);
    if (!donation) throw new Error("Donation request not found");

    const nextStatus = patch.status ?? donation.status;
    const nextTrailer =
      patch.trailer_id === undefined ? donation.trailer_id : patch.trailer_id;

    assertTrailerAvailable(nextTrailer, nextStatus, id);

    if (patch.load_size !== undefined) {
      applyLoadSize(donation, patch.load_size);
    }

    Object.assign(donation, {
      ...patch,
      trailer_id: nextTrailer,
      status: nextStatus,
      updated_at: now(),
    });

    // Free trailer when completed/cancelled
    if (nextStatus === "completed" || nextStatus === "cancelled") {
      donation.trailer_id = null;
    }

    return withTrailer(donation);
  },

  listReports() {
    return getStore()
      .reports.map(withDonation)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  createReport(
    input: Omit<TrailerReport, "id" | "created_at" | "updated_at" | "donation_requests">,
  ) {
    const donation = getStore().donations.find(
      (d) => d.id === input.donation_request_id,
    );
    if (!donation) throw new Error("Donation request not found");

    const existing = getStore().reports.find(
      (report) =>
        report.donation_request_id === input.donation_request_id &&
        report.report_type === input.report_type,
    );
    if (existing) {
      Object.assign(existing, input, { updated_at: now() });
      return withDonation(existing);
    }

    const report: TrailerReport = {
      id: uid(),
      ...input,
      created_at: now(),
      updated_at: now(),
    };
    getStore().reports.unshift(report);
    return withDonation(report);
  },

  listLoadSettings() {
    return [...getStore().loadSettings];
  },

  updateLoadSetting(
    loadSize: LoadSize,
    patch: Partial<Pick<LoadValueSetting, "estimated_pounds" | "value_per_pound" | "label">>,
  ) {
    const setting = getStore().loadSettings.find((s) => s.load_size === loadSize);
    if (!setting) throw new Error("Load setting not found");
    Object.assign(setting, patch, { updated_at: now() });
    return setting;
  },

  availableTrailers(excludeDonationId?: string) {
    const busy = new Set(
      getStore()
        .donations.filter(
          (d) =>
            d.id !== excludeDonationId &&
            d.trailer_id &&
            ACTIVE_TRAILER_STATUSES.includes(d.status),
        )
        .map((d) => d.trailer_id as string),
    );

    return getStore().trailers.filter((t) => t.is_active && !busy.has(t.id));
  },
};
