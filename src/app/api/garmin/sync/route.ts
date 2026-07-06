import { NextRequest, NextResponse } from "next/server";

import { garminConfigured } from "@/lib/garmin/client";
import { syncGarmin } from "@/lib/garmin/sync";

export async function POST(request: NextRequest) {
  if (!garminConfigured()) {
    return NextResponse.json(
      {
        error:
          "Garmin is not configured — set GARMIN_EMAIL and GARMIN_PASSWORD in .env.local and restart the dev server.",
      },
      { status: 503 },
    );
  }

  let days = 7;
  try {
    const body = (await request.json()) as { days?: number };
    if (typeof body.days === "number") {
      days = Math.min(30, Math.max(1, Math.floor(body.days)));
    }
  } catch {
    // Empty body — keep the default window.
  }

  try {
    const summary = await syncGarmin(days);
    return NextResponse.json({ summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json(
      {
        error: `Garmin sync failed: ${message}. Check your credentials — note that accounts with MFA/two-factor enabled are not supported by the unofficial API.`,
      },
      { status: 502 },
    );
  }
}
