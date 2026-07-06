import type {
  AcademicsFrontmatter,
  Deadline,
  RecurringItem,
  Weekday,
} from "@/lib/vault/types";

export const WEEKDAYS: Weekday[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

/** Where a block lives in the vault, so the UI can edit or delete it. */
export type BlockSource =
  | { kind: "meeting"; course: string; index: number }
  | { kind: "recurring"; index: number };

/** One weekly timed block, whatever its source. */
export interface WeeklyBlock {
  day: Weekday;
  start: string;
  end: string;
  title: string;
  /** Which module owns the block — drives its accent color. */
  module: "academics" | "fitness" | "wellness" | "other";
  location: string | null;
  source: BlockSource;
}

export interface BlockConflict {
  day: Weekday;
  a: WeeklyBlock;
  b: WeeklyBlock;
}

export interface DeadlinePileUp {
  date: string;
  count: number;
  examCount: number;
  titles: string[];
}

export interface DatedDeadline extends Deadline {
  course: string;
}

/** "HH:MM" → minutes since midnight. */
export function minutesOf(clock: string): number {
  const [h, m] = clock.split(":").map(Number);
  return h * 60 + m;
}

const minutes = minutesOf;

/** A block laid out on the 00:00–23:59 day timeline. */
export interface DayBlock extends WeeklyBlock {
  /** Which parallel column this block occupies when times overlap. */
  lane: number;
  /** Total columns in this block's overlap group. */
  lanes: number;
}

/**
 * Greedy interval layout: overlapping blocks get side-by-side lanes so
 * the day planner can render them without stacking.
 */
export function layoutDayBlocks(dayBlocks: WeeklyBlock[]): DayBlock[] {
  const sorted = [...dayBlocks].sort(
    (a, b) => minutes(a.start) - minutes(b.start) || minutes(b.end) - minutes(a.end),
  );
  const placed: DayBlock[] = [];
  let group: DayBlock[] = [];
  let groupEnd = -1;
  let laneEnds: number[] = [];

  const closeGroup = () => {
    for (const b of group) b.lanes = laneEnds.length;
    group = [];
    laneEnds = [];
  };

  for (const block of sorted) {
    const start = minutes(block.start);
    if (start >= groupEnd && group.length > 0) closeGroup();
    let lane = laneEnds.findIndex((end) => end <= start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(0);
    }
    laneEnds[lane] = minutes(block.end);
    groupEnd = Math.max(groupEnd, minutes(block.end));
    const placedBlock: DayBlock = { ...block, lane, lanes: 1 };
    group.push(placedBlock);
    placed.push(placedBlock);
  }
  closeGroup();
  return placed;
}

export function buildWeeklyBlocks(
  courses: AcademicsFrontmatter[],
  recurring: RecurringItem[],
): WeeklyBlock[] {
  const blocks: WeeklyBlock[] = [];
  for (const course of courses) {
    (course.meetings ?? []).forEach((meeting, index) => {
      blocks.push({
        day: meeting.day,
        start: meeting.start,
        end: meeting.end,
        title: course.course,
        module: "academics",
        location: meeting.location,
        source: { kind: "meeting", course: course.course, index },
      });
    });
  }
  recurring.forEach((item, index) => {
    blocks.push({
      day: item.day,
      start: item.start,
      end: item.end,
      title: item.title,
      module: item.module,
      location: null,
      source: { kind: "recurring", index },
    });
  });
  return blocks.sort(
    (a, b) =>
      WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day) ||
      minutes(a.start) - minutes(b.start),
  );
}

/** Pairwise time-overlap check within each weekday. */
export function findBlockConflicts(blocks: WeeklyBlock[]): BlockConflict[] {
  const conflicts: BlockConflict[] = [];
  for (const day of WEEKDAYS) {
    const dayBlocks = blocks.filter((b) => b.day === day);
    for (let i = 0; i < dayBlocks.length; i++) {
      for (let j = i + 1; j < dayBlocks.length; j++) {
        const a = dayBlocks[i];
        const b = dayBlocks[j];
        if (
          minutes(a.start) < minutes(b.end) &&
          minutes(b.start) < minutes(a.end)
        ) {
          conflicts.push({ day, a, b });
        }
      }
    }
  }
  return conflicts;
}

/** Days with 2+ open deadlines (worse when several are exams). */
export function findDeadlinePileUps(
  deadlines: DatedDeadline[],
): DeadlinePileUp[] {
  const open = deadlines.filter((d) => d.status !== "done");
  const byDate = new Map<string, DatedDeadline[]>();
  for (const d of open) {
    byDate.set(d.due, [...(byDate.get(d.due) ?? []), d]);
  }
  return [...byDate.entries()]
    .filter(([, list]) => list.length >= 2)
    .map(([date, list]) => ({
      date,
      count: list.length,
      examCount: list.filter((d) => d.kind === "exam").length,
      titles: list.map((d) => `${d.course}: ${d.title}`),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/* ------------------------------- month grid ------------------------------- */

export interface CalendarCell {
  /** "YYYY-MM-DD" */
  date: string;
  inMonth: boolean;
}

/** ISO weekday (mon=0..sun=6) for a "YYYY-MM-DD" string. */
export function weekdayIndex(dateISO: string): number {
  const d = new Date(`${dateISO}T12:00:00`);
  return (d.getDay() + 6) % 7;
}

export function weekdayOf(dateISO: string): Weekday {
  return WEEKDAYS[weekdayIndex(dateISO)];
}

/** Monday-first month grid covering full weeks around "YYYY-MM". */
export function monthGrid(month: string): CalendarCell[][] {
  const [year, m] = month.split("-").map(Number);
  const first = new Date(year, m - 1, 1, 12);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7));

  const weeks: CalendarCell[][] = [];
  const cursor = new Date(start);
  do {
    const week: CalendarCell[] = [];
    for (let i = 0; i < 7; i++) {
      const y = cursor.getFullYear();
      const mo = String(cursor.getMonth() + 1).padStart(2, "0");
      const da = String(cursor.getDate()).padStart(2, "0");
      week.push({
        date: `${y}-${mo}-${da}`,
        inMonth: cursor.getMonth() === m - 1,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  } while (cursor.getMonth() === m - 1);
  return weeks;
}

export function addMonths(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const d = new Date(year, m - 1 + delta, 1, 12);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, m - 1, 1, 12).toLocaleDateString("en-CA", {
    month: "long",
    year: "numeric",
  });
}
