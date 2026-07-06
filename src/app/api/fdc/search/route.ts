import { NextRequest, NextResponse } from "next/server";

import { searchFoods } from "@/lib/fdc";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ error: "Missing ?q=" }, { status: 400 });
  }
  if (!process.env.USDA_API_KEY) {
    return NextResponse.json(
      { error: "USDA_API_KEY is not configured" },
      { status: 503 },
    );
  }
  try {
    const results = await searchFoods(query);
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "FDC search failed" },
      { status: 502 },
    );
  }
}
