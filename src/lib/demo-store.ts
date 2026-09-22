import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { deleteDemoUploads, demoDataDir } from "@/lib/demo-files";
import { isServerlessHost } from "@/lib/supabase/server";
import {
  ACTIVE_TRAILER_STATUSES,
  DEFAULT_LOAD_VALUE_SETTINGS,
  DonationRequest,
  DonationStatus,
  LOAD_SIZES,
  LoadSize,
  LoadValueSetting,
  Trailer,
  TrailerReport,
  calcLoadEstimate,
} from "@/lib/types";

const now = () => new Date().toISOString();
const STORE_FILE = () => path.join(demoDataDir(), "demo-store.json");

function uid() {
  return crypto.randomUUID();
}

function assertDemoAllowed() {
  if (isServerlessHost()) {
    throw new Error(
      "Supabase is not configured on this deployment. In Vercel → Project Settings → Environment Variables, add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then redeploy.",
    );
  }
}

const defaultLoadSettings: LoadValueSetting[] = DEFAULT_LOAD_VALUE_SETTINGS.map(
  (setting) => ({
    id: `ls-${setting.load_size}`,
    ...setting,
    updated_at: now(),
  }),
);

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
      staff_signer_name: null,
      staff_signature: null,
      staff_signed_at: null,
      hold_harmless: true,
      agreements: { liability: true },
      raw_wufoo_payload: null,
      status: "scheduled",
      trailer_id: t1.id,
      scheduled_date: "2026-09-16",
      dropoff_store: "Danbury",
      load_size: "half",
      estimated_pounds: 2000,
      estimated_value: 520,
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
      staff_signer_name: null,
      staff_signature: null,
      staff_signed_at: null,
      hold_harmless: true,
      agreements: { liability: true },
      raw_wufoo_payload: null,
      status: "requested",
      trailer_id: null,
      scheduled_date: null,
      dropoff_store: null,
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
      staff_signer_name: null,
      staff_signature: null,
      staff_signed_at: null,
      hold_harmless: true,
      agreements: { liability: true },
      raw_wufoo_payload: null,
      status: "trailer_on_site",
      trailer_id: t2.id,
      scheduled_date: "2026-09-12",
      dropoff_store: "Bridgeport",
      load_size: "full",
      estimated_pounds: 4000,
      estimated_value: 1040,
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
      staff_signer_name: null,
      staff_signature: null,
      staff_signed_at: null,
      hold_harmless: true,
      agreements: { liability: true },
      raw_wufoo_payload: null,
      status: "completed",
      trailer_id: null,
      scheduled_date: "2026-08-28",
      dropoff_store: "Westport",
      load_size: "three_quarter",
      estimated_pounds: 3000,
      estimated_value: 780,
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

function persist(store: Store) {
  writeFileSync(STORE_FILE(), JSON.stringify(store, null, 2), "utf8");
}

function normalizeLoadSettings(settings: LoadValueSetting[]): {
  settings: LoadValueSetting[];
  migrated: boolean;
} {
  const hasLegacyRate = settings.some(
    (setting) => Number(setting.value_per_pound) === 1.5,
  );
  const hasLegacyThird = settings.some(
    (setting) => String(setting.load_size) === "third",
  );
  const missingCanonical = defaultLoadSettings.some(
    (defaults) =>
      !settings.some((setting) => setting.load_size === defaults.load_size),
  );

  // Reset when the store still has legacy fullness options or the old $1.50/lb seed.
  if (hasLegacyRate || hasLegacyThird || missingCanonical) {
    return {
      settings: defaultLoadSettings.map((item) => ({ ...item })),
      migrated: true,
    };
  }

  const next = defaultLoadSettings.map((defaults) => {
    const existing = settings.find(
      (setting) => setting.load_size === defaults.load_size,
    );
    if (!existing) return { ...defaults };
    return {
      ...defaults,
      id: existing.id,
      label: existing.label || defaults.label,
      estimated_pounds: Number(existing.estimated_pounds),
      value_per_pound: Number(existing.value_per_pound),
      updated_at: existing.updated_at || defaults.updated_at,
    };
  });

  return { settings: next, migrated: false };
}

function loadPersistedStore(): Store | null {
  try {
    const file = STORE_FILE();
    if (!existsSync(file)) return null;
    const parsed = JSON.parse(readFileSync(file, "utf8")) as Store;
    if (
      !parsed ||
      !Array.isArray(parsed.donations) ||
      !Array.isArray(parsed.trailers) ||
      !Array.isArray(parsed.reports) ||
      !Array.isArray(parsed.loadSettings)
    ) {
      return null;
    }
    // Backfill newer fields and normalize load settings to current fullness options.
    parsed.donations = parsed.donations.map((donation) => {
      const loadSize =
        donation.load_size &&
        (LOAD_SIZES as readonly string[]).includes(donation.load_size)
          ? donation.load_size
          : null;
      return {
        ...donation,
        staff_signer_name: donation.staff_signer_name ?? null,
        staff_signature: donation.staff_signature ?? null,
        staff_signed_at: donation.staff_signed_at ?? null,
        dropoff_store: donation.dropoff_store ?? null,
        load_size: loadSize,
      };
    });
    const normalized = normalizeLoadSettings(parsed.loadSettings);
    parsed.loadSettings = normalized.settings;
    // Refresh donation estimates from the active load settings.
    parsed.donations.forEach((donation) => {
      if (!donation.load_size) return;
      const setting = parsed.loadSettings.find(
        (item) => item.load_size === donation.load_size,
      );
      if (!setting) return;
      const estimate = calcLoadEstimate(
        Number(setting.estimated_pounds),
        Number(setting.value_per_pound),
      );
      donation.estimated_pounds = estimate.estimated_pounds;
      donation.estimated_value = estimate.estimated_value;
    });
    if (normalized.migrated) {
      writeFileSync(STORE_FILE(), JSON.stringify(parsed, null, 2), "utf8");
    }
    return parsed;
  } catch {
    return null;
  }
}

function getStore(): Store {
  assertDemoAllowed();
  if (!globalThis.__gtgDemoStore) {
    const existing = loadPersistedStore();
    globalThis.__gtgDemoStore = existing ?? seedStore();
    if (!existing) persist(globalThis.__gtgDemoStore);
  } else {
    // Hot reload can keep a stale in-memory store; re-align load settings.
    const normalized = normalizeLoadSettings(
      globalThis.__gtgDemoStore.loadSettings,
    );
    if (normalized.migrated) {
      globalThis.__gtgDemoStore.loadSettings = normalized.settings;
      globalThis.__gtgDemoStore.donations.forEach((donation) => {
        if (!donation.load_size) return;
        const setting = normalized.settings.find(
          (item) => item.load_size === donation.load_size,
        );
        if (!setting) return;
        const estimate = calcLoadEstimate(
          Number(setting.estimated_pounds),
          Number(setting.value_per_pound),
        );
        donation.estimated_pounds = estimate.estimated_pounds;
        donation.estimated_value = estimate.estimated_value;
      });
      persist(globalThis.__gtgDemoStore);
    }
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
    persist(getStore());
    return trailer;
  },

  updateTrailer(
    id: string,
    patch: Partial<Pick<Trailer, "name" | "notes" | "is_active">>,
  ) {
    const trailer = getStore().trailers.find((t) => t.id === id);
    if (!trailer) throw new Error("Trailer not found");
    Object.assign(trailer, patch, { updated_at: now() });
    persist(getStore());
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
    persist(store);
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
      staff_signer_name: input.staff_signer_name ?? null,
      staff_signature: input.staff_signature ?? null,
      staff_signed_at: input.staff_signed_at ?? null,
      hold_harmless: input.hold_harmless ?? false,
      agreements: input.agreements ?? {},
      raw_wufoo_payload: input.raw_wufoo_payload ?? null,
      status: input.status ?? "requested",
      trailer_id: input.trailer_id ?? null,
      scheduled_date: input.scheduled_date ?? null,
      dropoff_store: input.dropoff_store ?? null,
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
    persist(getStore());
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
        | "dropoff_store"
        | "load_size"
        | "staff_notes"
        | "first_name"
        | "last_name"
        | "organization"
        | "phone"
        | "email"
        | "staff_signer_name"
        | "staff_signature"
        | "staff_signed_at"
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

    persist(getStore());
    return withTrailer(donation);
  },

  deleteDonation(id: string) {
    const store = getStore();
    const donation = store.donations.find((item) => item.id === id);
    if (!donation) throw new Error("Donation request not found");
    const documentPaths = [
      donation.parking_photo_path,
      donation.license_photo_path,
    ].filter((path): path is string => Boolean(path));
    store.donations = store.donations.filter((item) => item.id !== id);
    store.reports = store.reports.filter(
      (report) => report.donation_request_id !== id,
    );
    persist(store);
    if (documentPaths.length) deleteDemoUploads(documentPaths);
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
      persist(getStore());
      return withDonation(existing);
    }

    const report: TrailerReport = {
      id: uid(),
      ...input,
      created_at: now(),
      updated_at: now(),
    };
    getStore().reports.unshift(report);
    persist(getStore());
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
    persist(getStore());
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
