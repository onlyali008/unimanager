import { promises as fs } from "node:fs";

import { linkEntryInDailyNote } from "./daily";
import { lastNDates, monthOf, monthsCoveringLastNDays } from "./dates";
import { readNote, resolveInVault, writeNote } from "./fs";
import type {
  AcademicsFrontmatter,
  CourseMeeting,
  Deadline,
  FinancesFrontmatter,
  FitnessFrontmatter,
  GarminWellness,
  MealEntry,
  NutritionFrontmatter,
  RecurringItem,
  ScheduleFrontmatter,
  SleepFrontmatter,
  Transaction,
  WellnessFrontmatter,
  WorkoutEntry,
} from "./types";

const DEFAULT_CURRENCY = "CAD";

function nowISO(): string {
  return new Date().toISOString();
}

/* ---------------------------------- nutrition --------------------------------- */

function nutritionTotals(meals: MealEntry[]) {
  const round1 = (n: number) => Math.round(n * 10) / 10;
  return {
    calories: Math.round(meals.reduce((s, m) => s + m.calories, 0)),
    protein_g: round1(meals.reduce((s, m) => s + m.protein_g, 0)),
    carbs_g: round1(meals.reduce((s, m) => s + m.carbs_g, 0)),
    fat_g: round1(meals.reduce((s, m) => s + m.fat_g, 0)),
  };
}

export async function addMeal(dateISO: string, meal: MealEntry): Promise<void> {
  const relPath = `nutrition/${dateISO}.md`;
  const existing = await readNote<NutritionFrontmatter>(relPath);
  const meals = [...(existing?.frontmatter.meals ?? []), meal];
  const frontmatter: NutritionFrontmatter = {
    type: "nutrition",
    date: dateISO,
    meals,
    totals: nutritionTotals(meals),
    tags: existing?.frontmatter.tags ?? [],
    created: existing?.frontmatter.created ?? nowISO(),
  };
  await writeNote(relPath, { ...frontmatter }, existing?.body ?? "");
  await linkEntryInDailyNote(dateISO, `nutrition/${dateISO}`, "Nutrition");
}

/* ----------------------------------- fitness ---------------------------------- */

function fitnessTotals(workouts: WorkoutEntry[]) {
  return {
    duration_min: Math.round(workouts.reduce((s, w) => s + w.duration_min, 0)),
    sessions: workouts.length,
  };
}

/** Appends a workout. Garmin workouts are deduped by activity id. */
export async function addWorkout(
  dateISO: string,
  workout: WorkoutEntry,
): Promise<boolean> {
  const relPath = `fitness/${dateISO}.md`;
  const existing = await readNote<FitnessFrontmatter>(relPath);
  const workouts = existing?.frontmatter.workouts ?? [];

  if (
    workout.garmin_activity_id !== null &&
    workouts.some((w) => w.garmin_activity_id === workout.garmin_activity_id)
  ) {
    return false;
  }

  const next = [...workouts, workout];
  const frontmatter: FitnessFrontmatter = {
    type: "fitness",
    date: dateISO,
    workouts: next,
    totals: fitnessTotals(next),
    tags: existing?.frontmatter.tags ?? [],
    created: existing?.frontmatter.created ?? nowISO(),
  };
  await writeNote(relPath, { ...frontmatter }, existing?.body ?? "");
  await linkEntryInDailyNote(dateISO, `fitness/${dateISO}`, "Fitness");
  return true;
}

/* ------------------------------------ sleep ----------------------------------- */

export interface SleepInput {
  bedtime: string;
  wake_time: string;
  duration_h: number;
  quality: number;
  interruptions: number;
  naps_min: number;
  source: "manual" | "garmin";
  sleep_score: number | null;
}

/**
 * Writes the night's sleep note. A manual entry always wins; a Garmin
 * sync never overwrites a manual note (returns false instead).
 */
export async function setSleep(
  dateISO: string,
  input: SleepInput,
): Promise<boolean> {
  const relPath = `sleep/${dateISO}.md`;
  const existing = await readNote<SleepFrontmatter>(relPath);
  if (input.source === "garmin" && existing?.frontmatter.source === "manual") {
    return false;
  }
  const frontmatter: SleepFrontmatter = {
    type: "sleep",
    date: dateISO,
    ...input,
    tags: existing?.frontmatter.tags ?? [],
    created: existing?.frontmatter.created ?? nowISO(),
  };
  await writeNote(relPath, { ...frontmatter }, existing?.body ?? "");
  await linkEntryInDailyNote(dateISO, `sleep/${dateISO}`, "Sleep");
  return true;
}

/* ---------------------------------- wellness ---------------------------------- */

export interface WellnessCheckIn {
  mood: number;
  energy: number;
  stress: number;
  symptoms: string[];
  /** Freeform note appended to the body. */
  notes?: string;
}

export async function setWellnessCheckIn(
  dateISO: string,
  input: WellnessCheckIn,
): Promise<void> {
  const relPath = `wellness/${dateISO}.md`;
  const existing = await readNote<WellnessFrontmatter>(relPath);
  const frontmatter: WellnessFrontmatter = {
    type: "wellness",
    date: dateISO,
    mood: input.mood,
    energy: input.energy,
    stress: input.stress,
    symptoms: input.symptoms,
    garmin: existing?.frontmatter.garmin ?? null,
    tags: existing?.frontmatter.tags ?? [],
    created: existing?.frontmatter.created ?? nowISO(),
  };
  let body = existing?.body ?? "";
  if (input.notes && input.notes.trim()) {
    body = body.trimEnd()
      ? `${body.trimEnd()}\n\n${input.notes.trim()}\n`
      : `${input.notes.trim()}\n`;
  }
  await writeNote(relPath, { ...frontmatter }, body);
  await linkEntryInDailyNote(dateISO, `wellness/${dateISO}`, "Wellness");
}

/** Merges Garmin daily metrics, preserving any subjective check-in. */
export async function mergeWellnessGarmin(
  dateISO: string,
  garmin: GarminWellness,
): Promise<void> {
  const relPath = `wellness/${dateISO}.md`;
  const existing = await readNote<WellnessFrontmatter>(relPath);
  const frontmatter: WellnessFrontmatter = {
    type: "wellness",
    date: dateISO,
    mood: existing?.frontmatter.mood ?? null,
    energy: existing?.frontmatter.energy ?? null,
    stress: existing?.frontmatter.stress ?? null,
    symptoms: existing?.frontmatter.symptoms ?? [],
    garmin,
    tags: existing?.frontmatter.tags ?? [],
    created: existing?.frontmatter.created ?? nowISO(),
  };
  await writeNote(relPath, { ...frontmatter }, existing?.body ?? "");
  await linkEntryInDailyNote(dateISO, `wellness/${dateISO}`, "Wellness");
}

/* ---------------------------------- finances ---------------------------------- */

function financeTotals(transactions: Transaction[]) {
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const income = round2(
    transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0),
  );
  const expenses = round2(
    transactions
      .filter((t) => t.amount < 0)
      .reduce((s, t) => s + Math.abs(t.amount), 0),
  );
  return { income, expenses, net: round2(income - expenses) };
}

export async function addTransaction(tx: Transaction): Promise<void> {
  const month = monthOf(tx.date);
  const relPath = `finances/${month}.md`;
  const existing = await readNote<FinancesFrontmatter>(relPath);
  const transactions = [...(existing?.frontmatter.transactions ?? []), tx];
  const frontmatter: FinancesFrontmatter = {
    type: "finances",
    month,
    currency: existing?.frontmatter.currency ?? DEFAULT_CURRENCY,
    transactions,
    totals: financeTotals(transactions),
    tags: existing?.frontmatter.tags ?? [],
    created: existing?.frontmatter.created ?? nowISO(),
  };
  await writeNote(relPath, { ...frontmatter }, existing?.body ?? "");
  await linkEntryInDailyNote(tx.date, `finances/${month}`, "Finances");
}

/* ---------------------------------- academics --------------------------------- */

export function courseSlug(course: string): string {
  return course
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface CourseInput {
  course: string;
  course_name: string;
  term: string;
  credits: number;
}

export async function upsertCourse(input: CourseInput): Promise<string> {
  const slug = courseSlug(input.course);
  const relPath = `academics/${slug}/notes-and-deadlines.md`;
  const existing = await readNote<AcademicsFrontmatter>(relPath);
  const frontmatter: AcademicsFrontmatter = {
    type: "academics",
    ...input,
    deadlines: existing?.frontmatter.deadlines ?? [],
    meetings: existing?.frontmatter.meetings ?? [],
    tags: existing?.frontmatter.tags ?? [],
    created: existing?.frontmatter.created ?? nowISO(),
  };
  await writeNote(
    relPath,
    { ...frontmatter },
    existing?.body ?? `# ${input.course} — ${input.course_name}\n\n`,
  );
  return slug;
}

const WEEKDAY_ORDER: Record<string, number> = {
  mon: 0,
  tue: 1,
  wed: 2,
  thu: 3,
  fri: 4,
  sat: 5,
  sun: 6,
};

export async function addCourseMeeting(
  course: string,
  meeting: CourseMeeting,
): Promise<boolean> {
  const slug = courseSlug(course);
  const relPath = `academics/${slug}/notes-and-deadlines.md`;
  const existing = await readNote<AcademicsFrontmatter>(relPath);
  if (!existing) return false;
  const meetings = [...(existing.frontmatter.meetings ?? []), meeting].sort(
    (a, b) =>
      WEEKDAY_ORDER[a.day] - WEEKDAY_ORDER[b.day] ||
      a.start.localeCompare(b.start),
  );
  await writeNote(
    relPath,
    { ...existing.frontmatter, meetings },
    existing.body,
  );
  return true;
}

const RECURRING_PATH = "schedule/recurring.md";

export async function getRecurringItems(): Promise<RecurringItem[]> {
  const note = await readNote<ScheduleFrontmatter>(RECURRING_PATH);
  return note?.frontmatter.items ?? [];
}

export async function addRecurringItem(item: RecurringItem): Promise<void> {
  const existing = await readNote<ScheduleFrontmatter>(RECURRING_PATH);
  const items = [...(existing?.frontmatter.items ?? []), item].sort(
    (a, b) =>
      WEEKDAY_ORDER[a.day] - WEEKDAY_ORDER[b.day] ||
      a.start.localeCompare(b.start),
  );
  const frontmatter: ScheduleFrontmatter = {
    type: "schedule",
    items,
    tags: existing?.frontmatter.tags ?? [],
    created: existing?.frontmatter.created ?? nowISO(),
  };
  await writeNote(
    RECURRING_PATH,
    { ...frontmatter },
    existing?.body ?? "# Recurring schedule\n\nManaged by Semestra.\n",
  );
}

export async function addDeadline(
  course: string,
  deadline: Deadline,
): Promise<boolean> {
  const slug = courseSlug(course);
  const relPath = `academics/${slug}/notes-and-deadlines.md`;
  const existing = await readNote<AcademicsFrontmatter>(relPath);
  if (!existing) return false;
  const frontmatter: AcademicsFrontmatter = {
    ...existing.frontmatter,
    deadlines: [...existing.frontmatter.deadlines, deadline].sort((a, b) =>
      a.due.localeCompare(b.due),
    ),
  };
  await writeNote(relPath, { ...frontmatter }, existing.body);
  return true;
}

/* ----------------------------------- readers ---------------------------------- */

export interface DatedNote<T> {
  date: string;
  frontmatter: T;
}

async function readDateNotes<T>(
  folder: string,
  days: number,
): Promise<DatedNote<T>[]> {
  const notes: DatedNote<T>[] = [];
  for (const date of lastNDates(days)) {
    const note = await readNote<T>(`${folder}/${date}.md`);
    if (note) notes.push({ date, frontmatter: note.frontmatter });
  }
  return notes;
}

export const getRecentNutrition = (days: number) =>
  readDateNotes<NutritionFrontmatter>("nutrition", days);

export const getRecentFitness = (days: number) =>
  readDateNotes<FitnessFrontmatter>("fitness", days);

export const getRecentSleep = (days: number) =>
  readDateNotes<SleepFrontmatter>("sleep", days);

export const getRecentWellness = (days: number) =>
  readDateNotes<WellnessFrontmatter>("wellness", days);

/** Finance notes for months overlapping the last `days` days, oldest first. */
export async function getRecentFinances(
  days: number,
): Promise<FinancesFrontmatter[]> {
  const result: FinancesFrontmatter[] = [];
  for (const month of monthsCoveringLastNDays(days)) {
    const note = await readNote<FinancesFrontmatter>(`finances/${month}.md`);
    if (note) result.push(note.frontmatter);
  }
  return result;
}

export async function getCourses(): Promise<AcademicsFrontmatter[]> {
  let dirs: string[] = [];
  try {
    const entries = await fs.readdir(resolveInVault("academics"), {
      withFileTypes: true,
    });
    dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
  const courses: AcademicsFrontmatter[] = [];
  for (const dir of dirs) {
    const note = await readNote<AcademicsFrontmatter>(
      `academics/${dir}/notes-and-deadlines.md`,
    );
    if (note) {
      // Normalize notes written before the Phase 2 meetings field existed.
      courses.push({
        ...note.frontmatter,
        deadlines: note.frontmatter.deadlines ?? [],
        meetings: note.frontmatter.meetings ?? [],
      });
    }
  }
  return courses.sort((a, b) => a.course.localeCompare(b.course));
}
