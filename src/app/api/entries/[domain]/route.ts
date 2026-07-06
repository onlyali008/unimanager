import { NextRequest, NextResponse } from "next/server";

import {
  addDeadline,
  addMeal,
  addTransaction,
  addWorkout,
  setSleep,
  setWellnessCheckIn,
  upsertCourse,
} from "@/lib/vault/entries";
import {
  academicsPayload,
  mealPayload,
  sleepPayload,
  transactionPayload,
  wellnessPayload,
  workoutPayload,
} from "@/lib/validation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> },
) {
  const { domain } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    switch (domain) {
      case "nutrition": {
        const parsed = mealPayload.safeParse(body);
        if (!parsed.success) return validationError(parsed.error);
        await addMeal(parsed.data.date, parsed.data.meal);
        return NextResponse.json({ ok: true });
      }
      case "fitness": {
        const parsed = workoutPayload.safeParse(body);
        if (!parsed.success) return validationError(parsed.error);
        await addWorkout(parsed.data.date, {
          ...parsed.data.workout,
          source: "manual",
          garmin_activity_id: null,
        });
        return NextResponse.json({ ok: true });
      }
      case "sleep": {
        const parsed = sleepPayload.safeParse(body);
        if (!parsed.success) return validationError(parsed.error);
        const { date, ...rest } = parsed.data;
        await setSleep(date, { ...rest, source: "manual", sleep_score: null });
        return NextResponse.json({ ok: true });
      }
      case "wellness": {
        const parsed = wellnessPayload.safeParse(body);
        if (!parsed.success) return validationError(parsed.error);
        const { date, ...rest } = parsed.data;
        await setWellnessCheckIn(date, rest);
        return NextResponse.json({ ok: true });
      }
      case "finances": {
        const parsed = transactionPayload.safeParse(body);
        if (!parsed.success) return validationError(parsed.error);
        await addTransaction(parsed.data);
        return NextResponse.json({ ok: true });
      }
      case "academics": {
        const parsed = academicsPayload.safeParse(body);
        if (!parsed.success) return validationError(parsed.error);
        if (parsed.data.action === "course") {
          const { course, course_name, term, credits } = parsed.data;
          await upsertCourse({ course, course_name, term, credits });
          return NextResponse.json({ ok: true });
        }
        const { course, title, due, kind, status, weight_pct } = parsed.data;
        const added = await addDeadline(course, {
          title,
          due,
          kind,
          status,
          weight_pct,
        });
        if (!added) {
          return NextResponse.json(
            { error: `Course "${course}" doesn't exist yet — add it first.` },
            { status: 404 },
          );
        }
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json(
          { error: `Unknown domain: ${domain}` },
          { status: 404 },
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Write failed" },
      { status: 500 },
    );
  }
}

function validationError(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
  const detail = error.issues
    .map((i) => `${i.path.join(".") || "payload"}: ${i.message}`)
    .join("; ");
  return NextResponse.json({ error: detail }, { status: 400 });
}
