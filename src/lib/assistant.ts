import type { Course, Task, Term } from "./types";
import {
  courseMap,
  daysUntil,
  dueBucket,
  formatDue,
  recommendTasks,
  relativeDays,
  resolveCourse,
  sortTasks,
  upcomingExams,
  WEEKDAY_LABELS,
} from "./tasks";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Build a compact, grounded snapshot of the student's term for a small model.
 * Kept short on purpose — a 1B model does better with a tight, factual prompt.
 */
export function buildScheduleContext(
  tasks: Task[],
  courses: Course[],
  term: Term | undefined,
  now: Date = new Date(),
): string {
  const cmap = courseMap(courses);
  const lines: string[] = [];

  lines.push(
    `Today is ${now.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })}.`,
  );
  if (term) lines.push(`Current term: ${term.name}.`);

  const activeCourses = courses.filter((c) => !c.archived);
  if (activeCourses.length > 0) {
    lines.push("", "Courses:");
    for (const c of activeCourses) {
      const days = c.meetingDays.map((d) => WEEKDAY_LABELS[d]).join("/");
      const when =
        c.meetingDays.length > 0
          ? ` — meets ${days}${c.meetingStart ? ` ${c.meetingStart}` : ""}${
              c.meetingEnd ? `-${c.meetingEnd}` : ""
            }`
          : "";
      lines.push(`- ${c.code || c.name} (${c.name})${when}`);
    }
  }

  const active = sortTasks(tasks.filter((t) => !t.completed));
  const upcoming = active.slice(0, 25);
  if (upcoming.length > 0) {
    lines.push("", "Open tasks (soonest first):");
    for (const t of upcoming) {
      const course = resolveCourse(t, cmap);
      const bucket = dueBucket(t, now);
      const flag = bucket === "overdue" ? " [OVERDUE]" : bucket === "today" ? " [TODAY]" : "";
      lines.push(
        `- ${t.title} (${t.type}${
          course ? `, ${course.code || course.name}` : ""
        }) — ${formatDue(t.dueAt)}${flag}`,
      );
    }
  } else {
    lines.push("", "No open tasks.");
  }

  return lines.join("\n");
}

export const ASSISTANT_SYSTEM_PROMPT =
  "You are Semestra's study assistant. You help a student understand and plan " +
  "their schedule. Answer only from the schedule data provided in the context. " +
  "Be concise and concrete: reference specific tasks, courses, and dates. If the " +
  "answer isn't in the data, say so plainly rather than inventing it. Never make " +
  "up assignments, grades, or dates.";

/**
 * Answer common schedule questions directly from the data, with no LLM.
 * Returns null if the question doesn't match a known intent. Used as a
 * fallback (and instant path) when no local model is connected.
 */
export function localAnswer(
  question: string,
  tasks: Task[],
  courses: Course[],
  now: Date = new Date(),
): string | null {
  const q = question.toLowerCase();
  const cmap = courseMap(courses);
  const active = tasks.filter((t) => !t.completed);

  const line = (t: Task): string => {
    const course = resolveCourse(t, cmap);
    const code = course ? `${course.code || course.name} · ` : "";
    const when = t.dueAt ? `${formatDue(t.dueAt)} (${relativeDays(t.dueAt, now)})` : "no due date";
    return `• ${t.title} — ${code}${when}`;
  };
  const list = (items: Task[], empty: string): string =>
    items.length ? items.map(line).join("\n") : empty;

  if (/\boverdue|late|behind\b/.test(q)) {
    const items = sortTasks(active.filter((t) => dueBucket(t, now) === "overdue"));
    return `Overdue work:\n${list(items, "Nothing overdue — you're on top of it. 🎉")}`;
  }
  if (/\btoday|tonight\b/.test(q)) {
    const items = sortTasks(active.filter((t) => dueBucket(t, now) === "today"));
    return `Due today:\n${list(items, "Nothing due today. 🎉")}`;
  }
  if (/\bweek\b/.test(q)) {
    const items = sortTasks(
      active.filter((t) => {
        if (!t.dueAt) return false;
        const d = daysUntil(t.dueAt, now);
        return d >= 0 && d <= 7;
      }),
    );
    return `Due in the next 7 days:\n${list(items, "Nothing due this week. 🎉")}`;
  }
  if (/\bexam|midterm|final|test\b/.test(q)) {
    const items = upcomingExams(active, now);
    return `Upcoming exams:\n${list(items, "No exams scheduled. 🎉")}`;
  }
  if (/work on|focus|priorit|what should|next up|start with/.test(q)) {
    const items = recommendTasks(active, now, 3);
    return `Here's what I'd tackle next:\n${list(items, "You're all caught up. 🎉")}`;
  }
  if (/\bplan\b|schedule/.test(q)) {
    const byDay: string[] = [];
    for (let i = 0; i < 5; i += 1) {
      const day = new Date(now);
      day.setDate(day.getDate() + i);
      const items = sortTasks(
        active.filter((t) => t.dueAt && daysUntil(t.dueAt, now) === i),
      );
      if (items.length) {
        const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : WEEKDAY_LABELS[day.getDay()];
        byDay.push(`${label}:\n${items.map(line).join("\n")}`);
      }
    }
    return byDay.length
      ? `Your next few days:\n\n${byDay.join("\n\n")}`
      : "Nothing scheduled in the next few days. 🎉";
  }
  return null;
}

export interface StreamOptions {
  baseUrl: string;
  model: string;
  messages: ChatMessage[];
  signal?: AbortSignal;
  onToken: (text: string) => void;
}

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

/**
 * Stream a chat completion from a local Ollama server (NDJSON over fetch).
 * Throws a friendly Error if the server can't be reached or rejects.
 */
export async function streamOllamaChat(opts: StreamOptions): Promise<void> {
  const base = normalizeBaseUrl(opts.baseUrl);
  let res: Response;
  try {
    res = await fetch(`${base}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: opts.model,
        messages: opts.messages,
        stream: true,
      }),
      signal: opts.signal,
    });
  } catch {
    throw new Error(
      "Could not reach Ollama. Make sure it is running and that it allows this app's origin (see setup below).",
    );
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (res.status === 404) {
      throw new Error(
        `Model not found. Pull it first: run "ollama pull ${opts.model}".`,
      );
    }
    throw new Error(
      `Ollama returned ${res.status}. ${detail.slice(0, 200)}`.trim(),
    );
  }
  if (!res.body) throw new Error("Ollama returned an empty response.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const obj = JSON.parse(trimmed) as {
          message?: { content?: string };
          done?: boolean;
        };
        const content = obj.message?.content;
        if (content) opts.onToken(content);
      } catch {
        // Skip malformed lines.
      }
    }
  }
}

/** List installed model tags; used to verify the connection in Settings. */
export async function listOllamaModels(baseUrl: string): Promise<string[]> {
  const base = normalizeBaseUrl(baseUrl);
  const res = await fetch(`${base}/api/tags`);
  if (!res.ok) throw new Error(`Ollama returned ${res.status}.`);
  const data = (await res.json()) as { models?: { name: string }[] };
  return (data.models ?? []).map((m) => m.name);
}
