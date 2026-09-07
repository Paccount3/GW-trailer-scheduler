import { NextRequest, NextResponse } from "next/server";
import { requireStaffFromRequest } from "@/lib/auth";
import { data } from "@/lib/data";

export async function GET(request: NextRequest) {
  if (!requireStaffFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await data.listReports());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!requireStaffFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  if (!body.donation_request_id || !body.report_type) {
    return NextResponse.json(
      { error: "donation_request_id and report_type are required" },
      { status: 400 },
    );
  }

  try {
    const report = await data.createReport({
      donation_request_id: body.donation_request_id,
      report_type: body.report_type,
      is_completed: Boolean(body.is_completed),
      completed_at: body.is_completed ? new Date().toISOString() : null,
      outside_condition: body.outside_condition ?? null,
      notes: body.notes ?? null,
      submitted_by: body.submitted_by ?? null,
      extras: body.extras ?? {},
    });

    if (body.is_completed) {
      const reportedLoad = body.extras?.estimated_load;
      if (
        ["quarter", "half", "three_quarter", "full"].includes(reportedLoad)
      ) {
        await data.updateDonation(body.donation_request_id, {
          load_size: reportedLoad,
        });
      }
    }

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Create failed" },
      { status: 400 },
    );
  }
}
