import type { Course, Priority, Task } from "./types";

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

export type DueBucket = "overdue" | "today" | "upcoming" | "someday";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function dueBucket(task: Task, now: Date = new Date()): DueBucket {
  if (!task.dueAt) return "someday";
  const due = new Date(task.dueAt);
  if (Number.isNaN(due.getTime())) return "someday";

  const today = startOfDay(now);
  const dueDay = startOfDay(due);

  if (dueDay.getTime() < today.getTime()) return "overdue";
  if (dueDay.getTime() === today.getTime()) {
    return due.getTime() < now.getTime() ? "overdue" : "today";
  }
  return "upcoming";
}

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const aTime = a.dueAt ? Date.parse(a.dueAt) : Number.POSITIVE_INFINITY;
    const bTime = b.dueAt ? Date.parse(b.dueAt) : Number.POSITIVE_INFINITY;
    if (aTime !== bTime) return aTime - bTime;
    const p = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (p !== 0) return p;
    return a.title.localeCompare(b.title);
  });
}

export interface TaskFilters {
  search: string;
  courseId: string | "all";
  type: string | "all";
  status: "all" | "active" | "completed";
}

export function filterTasks(
  tasks: Task[],
  filters: TaskFilters,
  courses: Course[] = [],
): Task[] {
  const q = filters.search.trim().toLowerCase();
  const courseName = new Map(courses.map((c) => [c.id, `${c.code} ${c.name}`]));
  return tasks.filter((t) => {
    if (filters.status === "active" && t.completed) return false;
    if (filters.status === "completed" && !t.completed) return false;
    if (filters.courseId !== "all" && t.courseId !== filters.courseId) {
      return false;
    }
    if (filters.type !== "all" && t.type !== filters.type) return false;
    if (q) {
      const label = t.courseId ? courseName.get(t.courseId) ?? "" : "";
      const haystack = `${t.title} ${label} ${t.notes ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

/* --- Term / course scoping ---------------------------------------- */

export function tasksInTerm(tasks: Task[], termId: string): Task[] {
  return tasks.filter((t) => t.termId === termId);
}

export function coursesInTerm(courses: Course[], termId: string): Course[] {
  return courses.filter((c) => c.termId === termId);
}

export function courseMap(courses: Course[]): Map<string, Course> {
  return new Map(courses.map((c) => [c.id, c]));
}

export function resolveCourse(
  task: Task,
  courses: Map<string, Course>,
): Course | undefined {
  return task.courseId ? courses.get(task.courseId) : undefined;
}

const FALLBACK_COLOR = "#8a8577";

export function taskColor(
  task: Task,
  courses: Map<string, Course>,
): string {
  const course = resolveCourse(task, courses);
  return course?.color ?? FALLBACK_COLOR;
}

export function courseLabel(course: Course): string {
  return course.code ? `${course.code}` : course.name;
}

/* --- Summary ------------------------------------------------------- */

export interface TaskSummary {
  overdue: number;
  today: number;
  upcoming: number;
  completed: number;
}

export function summarize(tasks: Task[], now: Date = new Date()): TaskSummary {
  const summary: TaskSummary = { overdue: 0, today: 0, upcoming: 0, completed: 0 };
  for (const t of tasks) {
    if (t.completed) {
      summary.completed += 1;
      continue;
    }
    const bucket = dueBucket(t, now);
    if (bucket === "overdue") summary.overdue += 1;
    else if (bucket === "today") summary.today += 1;
    else if (bucket === "upcoming") summary.upcoming += 1;
  }
  return summary;
}

/* --- Formatting ---------------------------------------------------- */

export function formatDue(dueAt: string | undefined): string {
  if (!dueAt) return "No due date";
  const d = new Date(dueAt);
  if (Number.isNaN(d.getTime())) return "No due date";
  const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date} · ${time}`;
}

export function formatDuration(minutes: number | undefined): string | null {
  if (!minutes || minutes <= 0) return null;
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/* --- Calendar helpers --------------------------------------------- */

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  x.setDate(x.getDate() - x.getDay()); // week starts Sunday
  return x;
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export interface CalendarItem {
  id: string;
  kind: "task" | "meeting";
  title: string;
  color: string;
  /** minutes since midnight for ordering; null when all-day/no time. */
  minutes: number | null;
  timeLabel: string;
  courseCode?: string;
  task?: Task;
}

function minutesFromTime(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function labelFromMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const mm = min % 60;
  const d = new Date();
  d.setHours(h, mm, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** Build the ordered list of calendar items for a specific day. */
export function itemsForDay(
  day: Date,
  tasks: Task[],
  courses: Course[],
): CalendarItem[] {
  const cmap = courseMap(courses);
  const items: CalendarItem[] = [];

  // Recurring course meetings.
  for (const c of courses) {
    if (c.archived) continue;
    if (!c.meetingDays.includes(day.getDay())) continue;
    const min = c.meetingStart ? minutesFromTime(c.meetingStart) : null;
    items.push({
      id: `meeting-${c.id}-${day.toDateString()}`,
      kind: "meeting",
      title: `${c.code} ${c.name}`.trim(),
      color: c.color,
      minutes: min,
      timeLabel:
        c.meetingStart && c.meetingEnd
          ? `${c.meetingStart}–${c.meetingEnd}`
          : c.meetingStart ?? "Class",
      courseCode: c.code,
    });
  }

  // Task due dates / study sessions on this day.
  for (const t of tasks) {
    if (!t.dueAt) continue;
    const due = new Date(t.dueAt);
    if (Number.isNaN(due.getTime())) continue;
    if (!sameDay(due, day)) continue;
    const min = due.getHours() * 60 + due.getMinutes();
    const course = resolveCourse(t, cmap);
    items.push({
      id: `task-${t.id}`,
      kind: "task",
      title: t.title,
      color: course?.color ?? FALLBACK_COLOR,
      minutes: min,
      timeLabel: labelFromMinutes(min),
      courseCode: course?.code,
      task: t,
    });
  }

  return items.sort((a, b) => {
    const am = a.minutes ?? Number.POSITIVE_INFINITY;
    const bm = b.minutes ?? Number.POSITIVE_INFINITY;
    if (am !== bm) return am - bm;
    return a.title.localeCompare(b.title);
  });
}
