import { NextRequest, NextResponse } from "next/server";

import { addCourseMeeting, addRecurringItem } from "@/lib/vault/entries";
import { schedulePayload } from "@/lib/validation";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = schedulePayload.safeParse(body);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join(".") || "payload"}: ${i.message}`)
      .join("; ");
    return NextResponse.json({ error: detail }, { status: 400 });
  }
  if (parsed.data.start >= parsed.data.end) {
    return NextResponse.json(
      { error: "Start time must be before end time" },
      { status: 400 },
    );
  }

  try {
    if (parsed.data.action === "meeting") {
      const { course, day, start, end, location } = parsed.data;
      const added = await addCourseMeeting(course, {
        day,
        start,
        end,
        location,
      });
      if (!added) {
        return NextResponse.json(
          { error: `Course "${course}" doesn't exist yet — add it first.` },
          { status: 404 },
        );
      }
      return NextResponse.json({ ok: true });
    }
    const { title, module, day, start, end } = parsed.data;
    await addRecurringItem({ title, module, day, start, end });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Write failed" },
      { status: 500 },
    );
  }
}
