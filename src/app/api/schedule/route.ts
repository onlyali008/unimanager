import { NextRequest, NextResponse } from "next/server";

import {
  addCourseMeeting,
  addRecurringItem,
  updateCourseMeeting,
  updateRecurringItem,
} from "@/lib/vault/entries";
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
  const data = parsed.data;
  if ("start" in data && data.start >= data.end) {
    return NextResponse.json(
      { error: "Start time must be before end time" },
      { status: 400 },
    );
  }

  const notFound = (what: string) =>
    NextResponse.json(
      { error: `${what} not found — it may have just been changed. Refresh and retry.` },
      { status: 404 },
    );

  try {
    switch (data.action) {
      case "meeting": {
        const { course, day, start, end, location } = data;
        const ok = await addCourseMeeting(course, { day, start, end, location });
        if (!ok) {
          return NextResponse.json(
            { error: `Course "${course}" doesn't exist yet — add it first.` },
            { status: 404 },
          );
        }
        return NextResponse.json({ ok: true });
      }
      case "recurring": {
        const { title, module, day, start, end } = data;
        await addRecurringItem({ title, module, day, start, end });
        return NextResponse.json({ ok: true });
      }
      case "update-meeting": {
        const { course, index, day, start, end, location } = data;
        const ok = await updateCourseMeeting(course, index, {
          day,
          start,
          end,
          location,
        });
        return ok ? NextResponse.json({ ok: true }) : notFound("Class time");
      }
      case "delete-meeting": {
        const ok = await updateCourseMeeting(data.course, data.index, null);
        return ok ? NextResponse.json({ ok: true }) : notFound("Class time");
      }
      case "update-recurring": {
        const { index, title, module, day, start, end } = data;
        const ok = await updateRecurringItem(index, {
          title,
          module,
          day,
          start,
          end,
        });
        return ok ? NextResponse.json({ ok: true }) : notFound("Recurring block");
      }
      case "delete-recurring": {
        const ok = await updateRecurringItem(data.index, null);
        return ok ? NextResponse.json({ ok: true }) : notFound("Recurring block");
      }
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Write failed" },
      { status: 500 },
    );
  }
}
