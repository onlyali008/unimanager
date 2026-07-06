import { NextRequest, NextResponse } from "next/server";

import { getFood } from "@/lib/fdc";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ fdcId: string }> },
) {
  const { fdcId } = await params;
  const id = Number(fdcId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid fdcId" }, { status: 400 });
  }
  if (!process.env.USDA_API_KEY) {
    return NextResponse.json(
      { error: "USDA_API_KEY is not configured" },
      { status: 503 },
    );
  }
  try {
    const food = await getFood(id);
    if (!food) {
      return NextResponse.json({ error: "Food not found" }, { status: 404 });
    }
    return NextResponse.json({ food });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "FDC lookup failed" },
      { status: 502 },
    );
  }
}
