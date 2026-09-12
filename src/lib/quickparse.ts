import type { Course, Priority, TaskType } from "./types";

export interface ParsedQuickAdd {
  title: string;
  dueAt?: string;
  courseId?: string;
  priority?: Priority;
  type?: TaskType;
  estimatedMinutes?: number;
}

const MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];
const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Parse a natural-language quick-add string like
 * "essay due fri 5pm #CS240 !high ~2h" into a task draft. Unrecognized text
 * becomes the title. Never throws; returns at least a title.
 */
export function parseQuickAdd(
  input: string,
  courses: Course[] = [],
  now: Date = new Date(),
): ParsedQuickAdd {
  const result: ParsedQuickAdd = { title: "" };
  let text = ` ${input} `;
  const cut = (re: RegExp) => {
    text = text.replace(re, " ");
  };

  // --- Estimate (~2h, ~90m, ~1.5h) ---
  let m = text.match(/~\s*(\d+(?:\.\d+)?)\s*(h|hr|hrs|hours?)\b/i);
  if (m) {
    result.estimatedMinutes = Math.round(parseFloat(m[1]) * 60);
    cut(/~\s*\d+(?:\.\d+)?\s*(h|hr|hrs|hours?)\b/i);
  } else if ((m = text.match(/~\s*(\d+)\s*(m|min|mins|minutes?)\b/i))) {
    result.estimatedMinutes = parseInt(m[1], 10);
    cut(/~\s*\d+\s*(m|min|mins|minutes?)\b/i);
  }

  // --- Priority (!high, !med, !low) ---
  m = text.match(/!(high|hi|med|medium|low)\b/i);
  if (m) {
    const p = m[1].toLowerCase();
    result.priority = p.startsWith("h") ? "high" : p.startsWith("l") ? "low" : "medium";
    cut(/!(high|hi|med|medium|low)\b/i);
  }

  // --- Course (#code / @code, then bare code match) ---
  m = text.match(/[#@]([A-Za-z0-9]+)/);
  if (m) {
    const tok = m[1].toLowerCase();
    const c = courses.find((course) => {
      const code = course.code.toLowerCase().replace(/\s+/g, "");
      const name = course.name.toLowerCase().replace(/\s+/g, "");
      return code === tok || (tok.length >= 3 && name.startsWith(tok));
    });
    if (c) result.courseId = c.id;
    cut(/[#@][A-Za-z0-9]+/);
  }
  if (!result.courseId) {
    for (const course of courses) {
      if (!course.code) continue;
      const re = new RegExp(`\\b${escapeRe(course.code).replace(/\\?\s+/g, "\\s*")}\\b`, "i");
      if (re.test(text)) {
        result.courseId = course.id;
        break;
      }
    }
  }

  // --- Time ---
  let hour: number | null = null;
  let minute = 0;
  if (/\bnoon\b/i.test(text)) {
    hour = 12;
    cut(/\bnoon\b/i);
  } else if (/\bmidnight\b/i.test(text)) {
    hour = 0;
    cut(/\bmidnight\b/i);
  } else if ((m = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i))) {
    hour = parseInt(m[1], 10) % 12;
    if (/pm/i.test(m[3])) hour += 12;
    minute = m[2] ? parseInt(m[2], 10) : 0;
    cut(/\b\d{1,2}(?::\d{2})?\s*(am|pm)\b/i);
  } else if ((m = text.match(/\b(\d{1,2}):(\d{2})\b/))) {
    hour = parseInt(m[1], 10);
    minute = parseInt(m[2], 10);
    cut(/\b\d{1,2}:\d{2}\b/);
  }

  // --- Date ---
  let day: Date | null = null;
  if (/\b(today|tonight)\b/i.test(text)) {
    day = new Date(now);
    cut(/\b(today|tonight)\b/i);
  } else if (/\b(tomorrow|tmrw|tmr)\b/i.test(text)) {
    day = addDays(now, 1);
    cut(/\b(tomorrow|tmrw|tmr)\b/i);
  } else if (/\bnext week\b/i.test(text)) {
    day = addDays(now, 7);
    cut(/\bnext week\b/i);
  } else if ((m = text.match(/\bin (\d+) days?\b/i))) {
    day = addDays(now, parseInt(m[1], 10));
    cut(/\bin \d+ days?\b/i);
  } else if ((m = text.match(/\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b/i))) {
    const target = WEEKDAYS.indexOf(m[1].toLowerCase().slice(0, 3));
    const ahead = (target - now.getDay() + 7) % 7;
    day = addDays(now, ahead);
    cut(/\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b/i);
  } else if (
    (m = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})\b/i))
  ) {
    const monthIdx = MONTHS.indexOf(m[1].toLowerCase().slice(0, 3));
    const dom = parseInt(m[2], 10);
    let d = new Date(now.getFullYear(), monthIdx, dom);
    if (startOfDay(d).getTime() < startOfDay(now).getTime()) {
      d = new Date(now.getFullYear() + 1, monthIdx, dom);
    }
    day = d;
    cut(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}\b/i);
  } else if ((m = text.match(/\b(\d{1,2})\/(\d{1,2})\b/))) {
    const monthIdx = parseInt(m[1], 10) - 1;
    const dom = parseInt(m[2], 10);
    if (monthIdx >= 0 && monthIdx <= 11 && dom >= 1 && dom <= 31) {
      let d = new Date(now.getFullYear(), monthIdx, dom);
      if (startOfDay(d).getTime() < startOfDay(now).getTime()) {
        d = new Date(now.getFullYear() + 1, monthIdx, dom);
      }
      day = d;
      cut(/\b\d{1,2}\/\d{1,2}\b/);
    }
  }

  if (day) {
    const due = startOfDay(day);
    if (hour !== null) due.setHours(hour, minute, 0, 0);
    else due.setHours(23, 59, 0, 0);
    result.dueAt = due.toISOString();
  } else if (hour !== null) {
    const due = new Date(now);
    due.setHours(hour, minute, 0, 0);
    if (due.getTime() < now.getTime()) due.setDate(due.getDate() + 1);
    result.dueAt = due.toISOString();
  }

  // --- Type inference (keywords kept in the title) ---
  if (/\b(exam|midterm|final|quiz|test)\b/i.test(text)) result.type = "exam";
  else if (/\b(reading|read)\b/i.test(text)) result.type = "reading";
  else if (/\bproject\b/i.test(text)) result.type = "project";
  else if (/\bstudy\b/i.test(text)) result.type = "study";

  // --- Title: leftover text, minus connective filler ---
  const title = text
    .replace(/\b(due|by)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  result.title = title || input.trim();
  return result;
}
