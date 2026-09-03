import type { Course, Task, Term } from "./types";
import {
  courseMap,
  dueBucket,
  formatDue,
  resolveCourse,
  sortTasks,
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
