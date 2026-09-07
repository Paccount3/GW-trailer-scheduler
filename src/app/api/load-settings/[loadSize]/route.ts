import { NextRequest, NextResponse } from "next/server";
import { requireStaffFromRequest } from "@/lib/auth";
import { data } from "@/lib/data";
import { LoadSize } from "@/lib/types";

type Params = { params: Promise<{ loadSize: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!requireStaffFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { loadSize } = await params;
  const body = await request.json().catch(() => ({}));

  try {
    const updated = await data.updateLoadSetting(loadSize as LoadSize, body);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 400 },
    );
  }
}
