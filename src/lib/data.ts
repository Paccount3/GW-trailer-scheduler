import { demoDb } from "@/lib/demo-store";
import { isSupabaseConfigured, getServiceSupabase } from "@/lib/supabase/server";
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

async function assertTrailerFree(
  trailerId: string | null | undefined,
  status: DonationStatus,
  excludeId?: string,
) {
  if (!trailerId || !ACTIVE_TRAILER_STATUSES.includes(status)) return;
  if (!isSupabaseConfigured()) return;

  const supabase = getServiceSupabase();
  let query = supabase
    .from("donation_requests")
    .select("id, reference_code, status")
    .eq("trailer_id", trailerId)
    .in("status", ACTIVE_TRAILER_STATUSES);

  if (excludeId) query = query.neq("id", excludeId);

  const { data, error } = await query.maybeSingle();
  if (error && error.code !== "PGRST116") throw error;
  if (data) {
    throw new Error(
      `Trailer is already assigned to ${data.reference_code} (${data.status}).`,
    );
  }
}

export const data = {
  async listTrailers(): Promise<Trailer[]> {
    if (!isSupabaseConfigured()) return demoDb.listTrailers();
    const { data: rows, error } = await getServiceSupabase()
      .from("trailers")
      .select("*")
      .order("name");
    if (error) throw error;
    return rows ?? [];
  },

  async createTrailer(input: {
    name: string;
    notes?: string | null;
    is_active?: boolean;
  }) {
    if (!isSupabaseConfigured()) return demoDb.createTrailer(input);
    const { data: row, error } = await getServiceSupabase()
      .from("trailers")
      .insert({
        name: input.name.trim(),
        notes: input.notes ?? null,
        is_active: input.is_active ?? true,
      })
      .select()
      .single();
    if (error) throw error;
    return row as Trailer;
  },

  async updateTrailer(
    id: string,
    patch: Partial<Pick<Trailer, "name" | "notes" | "is_active">>,
  ) {
    if (!isSupabaseConfigured()) return demoDb.updateTrailer(id, patch);
    const { data: row, error } = await getServiceSupabase()
      .from("trailers")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return row as Trailer;
  },

  async deleteTrailer(id: string) {
    if (!isSupabaseConfigured()) return demoDb.deleteTrailer(id);
    const { error } = await getServiceSupabase()
      .from("trailers")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  async listDonations(): Promise<DonationRequest[]> {
    if (!isSupabaseConfigured()) return demoDb.listDonations();
    const { data: rows, error } = await getServiceSupabase()
      .from("donation_requests")
      .select("*, trailers(*)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (rows ?? []) as DonationRequest[];
  },

  async getDonation(id: string) {
    if (!isSupabaseConfigured()) return demoDb.getDonation(id);
    const { data: row, error } = await getServiceSupabase()
      .from("donation_requests")
      .select("*, trailers(*)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return row as DonationRequest | null;
  },

  async createDonation(
    input: Partial<DonationRequest> &
      Pick<DonationRequest, "first_name" | "last_name">,
  ) {
    if (!isSupabaseConfigured()) return demoDb.createDonation(input);
    await assertTrailerFree(input.trailer_id, input.status ?? "requested");
    const { data: row, error } = await getServiceSupabase()
      .from("donation_requests")
      .insert({
        ...input,
        status: input.status ?? "requested",
      })
      .select("*, trailers(*)")
      .single();
    if (error) throw error;
    return row as DonationRequest;
  },

  async updateDonation(
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
    if (!isSupabaseConfigured()) return demoDb.updateDonation(id, patch);

    const current = await this.getDonation(id);
    if (!current) throw new Error("Donation request not found");

    const nextStatus = patch.status ?? current.status;
    let nextTrailer =
      patch.trailer_id === undefined ? current.trailer_id : patch.trailer_id;

    if (nextStatus === "completed" || nextStatus === "cancelled") {
      nextTrailer = null;
    }

    await assertTrailerFree(nextTrailer, nextStatus, id);

    const { data: row, error } = await getServiceSupabase()
      .from("donation_requests")
      .update({ ...patch, trailer_id: nextTrailer, status: nextStatus })
      .eq("id", id)
      .select("*, trailers(*)")
      .single();
    if (error) throw error;
    return row as DonationRequest;
  },

  async deleteDonation(id: string) {
    if (!isSupabaseConfigured()) return demoDb.deleteDonation(id);

    const supabase = getServiceSupabase();
    const current = await this.getDonation(id);
    if (!current) throw new Error("Donation request not found");

    const { error } = await supabase
      .from("donation_requests")
      .delete()
      .eq("id", id);
    if (error) throw error;

    const documentPaths = [
      current.parking_photo_path,
      current.license_photo_path,
    ].filter((path): path is string => Boolean(path));
    if (documentPaths.length) {
      await supabase.storage.from("request-documents").remove(documentPaths);
    }
  },

  async listReports(): Promise<TrailerReport[]> {
    if (!isSupabaseConfigured()) return demoDb.listReports();
    const { data: rows, error } = await getServiceSupabase()
      .from("trailer_reports")
      .select(
        "*, donation_requests(id, reference_code, first_name, last_name, organization, status)",
      )
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (rows ?? []) as TrailerReport[];
  },

  async createReport(
    input: Omit<
      TrailerReport,
      "id" | "created_at" | "updated_at" | "donation_requests"
    >,
  ) {
    if (!isSupabaseConfigured()) return demoDb.createReport(input);
    const { data: row, error } = await getServiceSupabase()
      .from("trailer_reports")
      .upsert(input, {
        onConflict: "donation_request_id,report_type",
      })
      .select(
        "*, donation_requests(id, reference_code, first_name, last_name, organization, status)",
      )
      .single();
    if (error) throw error;
    return row as TrailerReport;
  },

  async listLoadSettings(): Promise<LoadValueSetting[]> {
    if (!isSupabaseConfigured()) return demoDb.listLoadSettings();
    const { data: rows, error } = await getServiceSupabase()
      .from("load_value_settings")
      .select("*")
      .order("estimated_pounds");
    if (error) throw error;
    return rows ?? [];
  },

  async updateLoadSetting(
    loadSize: LoadSize,
    patch: Partial<
      Pick<LoadValueSetting, "estimated_pounds" | "value_per_pound" | "label">
    >,
  ) {
    if (!isSupabaseConfigured()) return demoDb.updateLoadSetting(loadSize, patch);
    const { data: row, error } = await getServiceSupabase()
      .from("load_value_settings")
      .update(patch)
      .eq("load_size", loadSize)
      .select()
      .single();
    if (error) throw error;
    return row as LoadValueSetting;
  },

  async availableTrailers(excludeDonationId?: string) {
    if (!isSupabaseConfigured()) return demoDb.availableTrailers(excludeDonationId);

    const trailers = await this.listTrailers();
    const donations = await this.listDonations();
    const busy = new Set(
      donations
        .filter(
          (d) =>
            d.id !== excludeDonationId &&
            d.trailer_id &&
            ACTIVE_TRAILER_STATUSES.includes(d.status),
        )
        .map((d) => d.trailer_id as string),
    );

    return trailers.filter((t) => t.is_active && !busy.has(t.id));
  },

  estimateForLoadSize(settings: LoadValueSetting[], loadSize: LoadSize) {
    const setting = settings.find((s) => s.load_size === loadSize);
    if (!setting) return null;
    return calcLoadEstimate(
      Number(setting.estimated_pounds),
      Number(setting.value_per_pound),
    );
  },
};
