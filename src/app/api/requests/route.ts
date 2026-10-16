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
  requireSupabaseWhenExpected,
  supabaseMisconfigError,
} from "@/lib/supabase/server";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_COMBINED_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const TYPE_ALIASES: Record<string, string> = {
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/x-png": "image/png",
  "image/x-citrix-jpeg": "image/jpeg",
  "image/x-citrix-png": "image/png",
};

function logRequest(
  requestId: string,
  stage: string,
  details: Record<string, unknown>,
) {
  console.error(
    JSON.stringify({
      scope: "trailer-request",
      requestId,
      stage,
      at: new Date().toISOString(),
      ...details,
    }),
  );
}

function errorPayload(error: unknown) {
  if (error instanceof Error) {
    const extra = error as Error & {
      code?: string;
      details?: string;
      hint?: string;
      statusCode?: number;
    };
    return {
      name: extra.name,
      message: extra.message,
      code: extra.code ?? null,
      details: extra.details ?? null,
      hint: extra.hint ?? null,
      statusCode: extra.statusCode ?? null,
    };
  }
  return { message: String(error) };
}

function fileMeta(value: FormDataEntryValue | null) {
  if (!(value instanceof File)) {
    return { present: false, kind: value === null ? "missing" : typeof value };
  }
  return {
    present: true,
    name: value.name,
    type: value.type || "(empty)",
    size: value.size,
  };
}

function sniffImageType(bytes: Uint8Array) {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  if (bytes.length >= 12 && bytes[4] === 0x66 && bytes[5] === 0x74) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand)) {
      return "image/heic";
    }
  }
  return null;
}

const FIELD_LABELS: Record<string, string> = {
  first_name: "First name",
  last_name: "Last name",
  organization: "Organization or business name",
  address_type: "Address type",
  dropoff_town: "Drop-off town",
  address_line1: "Street address",
  address_line2: "Address line 2",
  city: "City",
  state: "State / province / region",
  zip: "Postal / ZIP code",
  country: "Country",
  phone: "Phone number",
  email: "Email",
  requested_duration_days: "Number of days",
  scheduled_date: "Requested drop-off date",
  parking_location_description: "Trailer parking location description",
  heard_about: "How did you hear about Mobile Donation Centers",
  signature: "Full legal signature",
  parking_photo: "Parking-location photo",
  license_photo: "Driver’s license photo",
};

const requestSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(1, "First name is required.")
    .max(80, "First name must be 80 characters or fewer."),
  last_name: z
    .string()
    .trim()
    .min(1, "Last name is required.")
    .max(80, "Last name must be 80 characters or fewer."),
  organization: z
    .string()
    .trim()
    .max(150, "Organization or business name must be 150 characters or fewer.")
    .optional(),
  address_type: z.enum(["residential", "organization"], {
    error: "Please select an address type.",
  }),
  dropoff_town: z.enum(SERVICE_TOWNS, {
    error: "Please select a drop-off town from the list.",
  }),
  address_line1: z
    .string()
    .trim()
    .min(1, "Street address is required.")
    .max(150, "Street address must be 150 characters or fewer."),
  address_line2: z
    .string()
    .trim()
    .max(150, "Address line 2 must be 150 characters or fewer.")
    .optional(),
  city: z
    .string()
    .trim()
    .min(1, "City is required.")
    .max(100, "City must be 100 characters or fewer."),
  state: z
    .string()
    .trim()
    .min(2, "State / province / region must be at least 2 characters.")
    .max(50, "State / province / region must be 50 characters or fewer."),
  zip: z
    .string()
    .trim()
    .min(5, "Postal / ZIP code must be at least 5 characters.")
    .max(12, "Postal / ZIP code must be 12 characters or fewer."),
  country: z
    .string()
    .trim()
    .min(1, "Country is required.")
    .max(80, "Country must be 80 characters or fewer."),
  phone: z
    .string()
    .trim()
    .min(10, "Phone number must be at least 10 digits.")
    .max(30, "Phone number must be 30 characters or fewer."),
  email: z.email("Please enter a valid email address."),
  requested_duration_days: z.coerce
    .number({ error: "Please select 2 or 3 days." })
    .int("Please select 2 or 3 days.")
    .refine((value) => [2, 3].includes(value), {
      message: "Please select 2 or 3 days.",
    }),
  scheduled_date: z.iso.date({
    error: "Please choose a valid requested drop-off date.",
  }),
  parking_location_description: z
    .string()
    .trim()
    .min(1, "Please describe the trailer parking location.")
    .max(
      2000,
      "Trailer parking location description must be 2000 characters or fewer.",
    ),
  heard_about: z
    .string()
    .trim()
    .min(1, "Please tell us how you heard about Mobile Donation Centers.")
    .max(120, "That answer is too long."),
  signature: z
    .string()
    .trim()
    .min(2, "Full legal signature must be at least 2 characters.")
    .max(150, "Full legal signature must be 150 characters or fewer."),
});

function formatValidationIssue(issue: z.core.$ZodIssue) {
  const field = String(issue.path[0] || "");
  const label = FIELD_LABELS[field] || field || "Form";
  const message = issue.message || "Please check this field.";
  // Avoid returning raw Zod wording if a custom message somehow wasn't applied.
  const looksGeneric =
    /^too small/i.test(message) ||
    /^too big/i.test(message) ||
    /^invalid/i.test(message) ||
    /^expected /i.test(message);
  return {
    field: field || undefined,
    error: looksGeneric ? `${label}: ${message}` : message,
  };
}

function checked(form: FormData, name: string) {
  return form.get(name) === "on";
}

async function validateImage(value: FormDataEntryValue | null, label: string) {
  if (!(value instanceof File) || value.size === 0) {
    throw new Error(`${label} is required.`);
  }
  const sizeLabel = `${(value.size / (1024 * 1024)).toFixed(1)} MB`;
  if (value.size > MAX_FILE_SIZE) {
    throw new Error(
      `${label} "${value.name || "photo"}" is ${sizeLabel}, which is over the 8 MB limit.`,
    );
  }

  const declared = TYPE_ALIASES[value.type.toLowerCase()] || value.type.toLowerCase();
  const header = new Uint8Array(await value.slice(0, 16).arrayBuffer());
  const sniffed = sniffImageType(header);
  const type = IMAGE_TYPES.has(declared) ? declared : sniffed;

  if (sniffed === "image/heic" || declared === "image/heic" || declared === "image/heif") {
    throw new Error(
      `${label} "${value.name || "photo"}" is a HEIC photo (${sizeLabel}, reported as ${value.type || "unknown"}). Save it as a JPG or PNG and try again.`,
    );
  }
  if (!type || !IMAGE_TYPES.has(type)) {
    throw new Error(
      `${label} "${value.name || "photo"}" is not a usable JPG, PNG, or WebP. Size ${sizeLabel}, reported type ${value.type || "unknown"}, detected contents ${sniffed || "unrecognized"}.`,
    );
  }

  if (type === value.type) return value;
  return new File([value], value.name || "photo", { type });
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
    throw new Error(supabaseMisconfigError());
  }

  const path = `${folder}/${crypto.randomUUID()}.${safeExtension(file)}`;
  const bytes = await file.arrayBuffer();

  const { error } = await getServiceSupabase().storage
    .from("request-documents")
    .upload(path, bytes, {
      contentType: file.type,
      upsert: false,
    });
  if (error) {
    throw new Error(
      `Photo storage upload failed for a ${file.type || "unknown"} file (${(file.size / (1024 * 1024)).toFixed(1)} MB): ${error.message}`,
    );
  }
  return path;
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);
  const userAgent = request.headers.get("user-agent") || "";
  const contentLength = request.headers.get("content-length");

  try {
    requireSupabaseWhenExpected();
    if (!isSupabaseConfigured()) {
      logRequest(requestId, "unconfigured", { userAgent });
      return NextResponse.json(
        {
          error: supabaseMisconfigError(),
          storage: "unconfigured",
          request_id: requestId,
        },
        { status: 503 },
      );
    }

    const form = await request.formData();
    logRequest(requestId, "received", {
      userAgent,
      contentLength,
      parking: fileMeta(form.get("parking_photo")),
      license: fileMeta(form.get("license_photo")),
    });

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
      logRequest(requestId, "missing-agreement", { missingAgreement, userAgent });
      return NextResponse.json(
        {
          error: "Every required agreement must be accepted.",
          request_id: requestId,
        },
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
      const formatted = firstIssue
        ? formatValidationIssue(firstIssue)
        : { field: undefined, error: "Please check the required fields." };
      logRequest(requestId, "validation", {
        userAgent,
        field: formatted.field ?? null,
        message: formatted.error,
      });
      return NextResponse.json(
        {
          error: formatted.error,
          field: formatted.field,
          request_id: requestId,
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

    const parkingPhoto = await validateImage(
      form.get("parking_photo"),
      "Parking location photo",
    );
    const licensePhoto = await validateImage(
      form.get("license_photo"),
      "Driver’s license photo",
    );
    const combinedBytes = parkingPhoto.size + licensePhoto.size;
    if (combinedBytes > MAX_COMBINED_BYTES) {
      throw new Error(
        `The photos are too large to upload together (${(parkingPhoto.size / (1024 * 1024)).toFixed(1)} MB + ${(licensePhoto.size / (1024 * 1024)).toFixed(1)} MB, limit 4.0 MB). Choose smaller images and try again.`,
      );
    }
    logRequest(requestId, "photos-accepted", {
      userAgent,
      parking: { type: parkingPhoto.type, size: parkingPhoto.size },
      license: { type: licensePhoto.type, size: licensePhoto.size },
    });

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

    logRequest(requestId, "saved", {
      userAgent,
      donationId: donation.id,
      referenceCode: donation.reference_code,
    });

    return NextResponse.json(
      {
        ok: true,
        id: donation.id,
        reference_code: donation.reference_code,
        storage: "supabase",
        request_id: requestId,
      },
      { status: 201 },
    );
  } catch (error) {
    logRequest(requestId, "failed", {
      userAgent,
      contentLength,
      error: errorPayload(error),
    });
    return NextResponse.json(
      {
        ok: false,
        storage: "error",
        request_id: requestId,
        error:
          error instanceof Error
            ? error.message
            : "Unable to submit your request.",
      },
      { status: 400 },
    );
  }
}
