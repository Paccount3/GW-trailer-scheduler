import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { data } from "@/lib/data";
import {
  HOLD_HARMLESS_TEXT,
  HOLD_HARMLESS_VERSION,
  SERVICE_TOWNS,
} from "@/lib/hold-harmless";
import {
  getServiceSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const requestSchema = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  organization: z.string().trim().max(150).optional(),
  address_type: z.enum(["residential", "organization"]),
  dropoff_town: z.enum(SERVICE_TOWNS),
  address_line1: z.string().trim().min(1).max(150),
  address_line2: z.string().trim().max(150).optional(),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(2).max(50),
  zip: z.string().trim().min(5).max(12),
  country: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(10).max(30),
  email: z.email(),
  requested_duration_days: z.coerce.number().int().refine((value) => [2, 3].includes(value)),
  scheduled_date: z.iso.date(),
  parking_location_description: z.string().trim().min(10).max(2000),
  heard_about: z.string().trim().min(1).max(120),
  signature: z.string().trim().min(2).max(150),
});

function checked(form: FormData, name: string) {
  return form.get(name) === "on";
}

function validateImage(value: FormDataEntryValue | null, label: string) {
  if (!(value instanceof File) || value.size === 0) {
    throw new Error(`${label} is required.`);
  }
  if (!IMAGE_TYPES.has(value.type)) {
    throw new Error(`${label} must be a JPG, PNG, or WebP image.`);
  }
  if (value.size > MAX_FILE_SIZE) {
    throw new Error(`${label} must be smaller than 8 MB.`);
  }
  return value;
}

function safeExtension(file: File) {
  const byType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return byType[file.type] || "bin";
}

async function uploadPrivateImage(file: File, folder: string) {
  if (!isSupabaseConfigured()) {
    return `demo/${folder}/${file.name}`;
  }

  const path = `${folder}/${crypto.randomUUID()}.${safeExtension(file)}`;
  const { error } = await getServiceSupabase().storage
    .from("request-documents")
    .upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: false,
    });
  if (error) throw error;
  return path;
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();

    // Honeypot field: real users never see or fill this.
    if (String(form.get("website") || "")) {
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    const requiredAgreements = [
      "hold_harmless_agreed",
      "non_donatable_agreed",
      "intended_use_agreed",
      "lock_removal_agreed",
      "stationary_agreed",
      "goodwill_only_agreed",
      "lawn_sign_agreed",
    ];
    const missingAgreement = requiredAgreements.find(
      (name) => !checked(form, name),
    );
    if (missingAgreement) {
      return NextResponse.json(
        { error: "Every required agreement must be accepted." },
        { status: 400 },
      );
    }

    const parsed = requestSchema.safeParse({
      first_name: form.get("first_name"),
      last_name: form.get("last_name"),
      organization: form.get("organization") || undefined,
      address_type: form.get("address_type"),
      dropoff_town: form.get("dropoff_town"),
      address_line1: form.get("address_line1"),
      address_line2: form.get("address_line2") || undefined,
      city: form.get("city"),
      state: form.get("state"),
      zip: form.get("zip"),
      country: form.get("country"),
      phone: form.get("phone"),
      email: form.get("email"),
      requested_duration_days: form.get("requested_duration_days"),
      scheduled_date: form.get("scheduled_date"),
      parking_location_description: form.get(
        "parking_location_description",
      ),
      heard_about: form.get("heard_about"),
      signature: form.get("signature"),
    });

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return NextResponse.json(
        {
          error: firstIssue?.message || "Please check the required fields.",
          field: firstIssue?.path[0],
        },
        { status: 400 },
      );
    }

    if (
      parsed.data.address_type === "organization" &&
      !parsed.data.organization
    ) {
      return NextResponse.json(
        {
          error:
            "Organization or business name is required for a business address.",
          field: "organization",
        },
        { status: 400 },
      );
    }

    const selectedDate = new Date(`${parsed.data.scheduled_date}T12:00:00`);
    if (selectedDate.getDay() === 0 || selectedDate.getDay() === 6) {
      return NextResponse.json(
        {
          error: "Drop-offs and pickups occur Monday through Friday only.",
          field: "scheduled_date",
        },
        { status: 400 },
      );
    }

    const parkingPhoto = validateImage(
      form.get("parking_photo"),
      "Parking location photo",
    );
    const licensePhoto = validateImage(
      form.get("license_photo"),
      "Driver’s license photo",
    );

    const uploadFolder = `pending-${Date.now()}-${crypto.randomUUID()}`;
    const [parkingPhotoPath, licensePhotoPath] = await Promise.all([
      uploadPrivateImage(parkingPhoto, `${uploadFolder}/parking`),
      uploadPrivateImage(licensePhoto, `${uploadFolder}/license`),
    ]);

    const signedAt = new Date().toISOString();
    const agreements = {
      source: "native_web_form",
      hold_harmless_agreed: true,
      non_donatable_agreed: true,
      intended_use_agreed: true,
      lock_removal_agreed: true,
      stationary_agreed: true,
      goodwill_only_agreed: true,
      lawn_sign_agreed: true,
      agreement_version: HOLD_HARMLESS_VERSION,
      agreement_snapshot: HOLD_HARMLESS_TEXT,
      signed_at: signedAt,
      country: parsed.data.country,
    };

    const donation = await data.createDonation({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      organization: parsed.data.organization || null,
      address_type: parsed.data.address_type,
      dropoff_town: parsed.data.dropoff_town,
      address_line1: parsed.data.address_line1,
      address_line2: parsed.data.address_line2 || null,
      city: parsed.data.city,
      state: parsed.data.state,
      zip: parsed.data.zip,
      phone: parsed.data.phone,
      email: parsed.data.email,
      requested_days: `${parsed.data.requested_duration_days} days beginning ${parsed.data.scheduled_date}`,
      requested_duration_days: parsed.data.requested_duration_days,
      scheduled_date: parsed.data.scheduled_date,
      parking_location_description:
        parsed.data.parking_location_description,
      parking_photo_path: parkingPhotoPath,
      license_photo_path: licensePhotoPath,
      heard_about: parsed.data.heard_about,
      signature: parsed.data.signature,
      signed_at: signedAt,
      agreement_version: HOLD_HARMLESS_VERSION,
      hold_harmless: true,
      agreements,
      raw_wufoo_payload: null,
      status: "requested",
    });

    return NextResponse.json(
      {
        ok: true,
        id: donation.id,
        reference_code: donation.reference_code,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to submit your request.",
      },
      { status: 400 },
    );
  }
}
