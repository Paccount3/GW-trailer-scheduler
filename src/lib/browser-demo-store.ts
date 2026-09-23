"use client";

import {
  DonationRequest,
  LoadValueSetting,
  Trailer,
  TrailerReport,
} from "@/lib/types";

const STORAGE_KEY = "gtg-browser-demo-v2";

export type BrowserDemoState = {
  donations: DonationRequest[];
  trailers: Trailer[];
  reports: TrailerReport[];
  loadSettings: LoadValueSetting[];
  nextReference: number;
};

function emptyState(): BrowserDemoState {
  return {
    donations: [],
    trailers: [],
    reports: [],
    loadSettings: [],
    nextReference: 1001,
  };
}

export function isBrowserDemoAvailable() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function readBrowserDemo(): BrowserDemoState | null {
  if (!isBrowserDemoAvailable()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BrowserDemoState;
    if (!parsed || !Array.isArray(parsed.donations)) return null;
    return {
      donations: parsed.donations ?? [],
      trailers: parsed.trailers ?? [],
      reports: parsed.reports ?? [],
      loadSettings: parsed.loadSettings ?? [],
      nextReference: Number(parsed.nextReference) || 1001,
    };
  } catch {
    return null;
  }
}

export function writeBrowserDemo(state: BrowserDemoState) {
  if (!isBrowserDemoAvailable()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Seed trailers/settings once; never reintroduce filler donations. */
export function ensureBrowserDemo(seed?: {
  trailers?: Trailer[];
  loadSettings?: LoadValueSetting[];
}): BrowserDemoState {
  const existing = readBrowserDemo();
  if (existing) {
    let changed = false;
    if (!existing.trailers.length && seed?.trailers?.length) {
      existing.trailers = seed.trailers;
      changed = true;
    }
    if (!existing.loadSettings.length && seed?.loadSettings?.length) {
      existing.loadSettings = seed.loadSettings;
      changed = true;
    }
    if (changed) writeBrowserDemo(existing);
    return existing;
  }

  const created: BrowserDemoState = {
    ...emptyState(),
    trailers: seed?.trailers ?? [],
    loadSettings: seed?.loadSettings ?? [],
  };
  writeBrowserDemo(created);
  return created;
}

export function listBrowserDonations() {
  return ensureBrowserDemo().donations;
}

export function getBrowserDonation(id: string) {
  return ensureBrowserDemo().donations.find((item) => item.id === id) ?? null;
}

export function upsertBrowserDonation(donation: DonationRequest) {
  const state = ensureBrowserDemo();
  const index = state.donations.findIndex((item) => item.id === donation.id);
  if (index >= 0) {
    state.donations[index] = donation;
  } else {
    state.donations.unshift(donation);
  }
  writeBrowserDemo(state);
  return donation;
}

export function updateBrowserDonation(
  id: string,
  patch: Partial<DonationRequest>,
) {
  const state = ensureBrowserDemo();
  const index = state.donations.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("Donation request not found");
  const current = state.donations[index];
  const nextStatus = patch.status ?? current.status;
  let nextTrailer =
    patch.trailer_id === undefined ? current.trailer_id : patch.trailer_id;
  if (nextStatus === "completed" || nextStatus === "cancelled") {
    nextTrailer = null;
  }
  const updated: DonationRequest = {
    ...current,
    ...patch,
    status: nextStatus,
    trailer_id: nextTrailer,
    updated_at: new Date().toISOString(),
  };
  if (patch.trailer_id !== undefined || patch.status !== undefined) {
    const trailer =
      state.trailers.find((item) => item.id === updated.trailer_id) || null;
    updated.trailers = trailer;
  }
  state.donations[index] = updated;
  writeBrowserDemo(state);
  return updated;
}

export function deleteBrowserDonation(id: string) {
  const state = ensureBrowserDemo();
  state.donations = state.donations.filter((item) => item.id !== id);
  state.reports = state.reports.filter(
    (report) => report.donation_request_id !== id,
  );
  writeBrowserDemo(state);
}

export function nextBrowserReferenceCode() {
  const state = ensureBrowserDemo();
  const code = String(state.nextReference);
  state.nextReference += 1;
  writeBrowserDemo(state);
  return code;
}

export function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}
