import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireStaffFromRequest } from "@/lib/auth";
import { data } from "@/lib/data";

type Params = { params: Promise<{ id: string }> };

const countersignSchema = z.object({
  staff_signer_name: z.string().trim().min(2).max(120),
  staff_signature: z.string().trim().min(2).max(150),
});

export async function POST(request: NextRequest, { params }: Params) {
  if (!requireStaffFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = countersignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter the staff member’s printed name and signature." },
      { status: 400 },
    );
  }

  try {
    const updated = await data.countersignDonation(id, parsed.data);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to counter-sign.",
      },
      { status: 400 },
    );
  }
}
