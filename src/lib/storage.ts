import type {
  Artifact,
  ArtifactKind,
  Course,
  Priority,
  Settings,
  StoreState,
  Task,
  Term,
  TaskType,
} from "./types";
import {
  COURSE_PALETTE,
  CURRENT_SCHEMA_VERSION,
  DEFAULT_OLLAMA_MODEL,
  DEFAULT_OLLAMA_URL,
  PRIORITIES,
  TASK_TYPES,
} from "./types";
import { createSeedState } from "./seed";

const STORAGE_KEY = "semestra.store";
const INIT_KEY = "semestra.initialized";

function isTaskType(v: unknown): v is TaskType {
  return typeof v === "string" && (TASK_TYPES as string[]).includes(v);
}
function isPriority(v: unknown): v is Priority {
  return typeof v === "string" && (PRIORITIES as string[]).includes(v);
}
function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim().length > 0 ? v : undefined;
}
function isoOrUndef(v: unknown): string | undefined {
  return typeof v === "string" && !Number.isNaN(Date.parse(v)) ? v : undefined;
}

function coerceTerm(value: unknown): Term | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (!str(v.id) || !str(v.name)) return null;
  const term: Term = { id: v.id as string, name: v.name as string };
  const start = str(v.startDate);
  const end = str(v.endDate);
  if (start) term.startDate = start;
  if (end) term.endDate = end;
  return term;
}

function coerceCourse(value: unknown, fallbackTermId: string): Course | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (!str(v.id) || !str(v.name)) return null;
  const days = Array.isArray(v.meetingDays)
    ? v.meetingDays.filter(
        (d): d is number => typeof d === "number" && d >= 0 && d <= 6,
      )
    : [];
  const course: Course = {
    id: v.id as string,
    name: v.name as string,
    code: str(v.code) ?? "",
    color: str(v.color) ?? COURSE_PALETTE[0],
    termId: str(v.termId) ?? fallbackTermId,
    meetingDays: days,
    archived: v.archived === true,
    createdAt: isoOrUndef(v.createdAt) ?? new Date().toISOString(),
  };
  const instructor = str(v.instructor);
  const mStart = str(v.meetingStart);
  const mEnd = str(v.meetingEnd);
  const target = str(v.targetGrade);
  if (instructor) course.instructor = instructor;
  if (mStart) course.meetingStart = mStart;
  if (mEnd) course.meetingEnd = mEnd;
  if (target) course.targetGrade = target;
  if (typeof v.notes === "string") course.notes = v.notes;
  return course;
}

function coerceTask(value: unknown, fallbackTermId: string): Task | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (!str(v.id) || !str(v.title)) return null;

  const task: Task = {
    id: v.id as string,
    title: v.title as string,
    type: isTaskType(v.type) ? v.type : "assignment",
    termId: str(v.termId) ?? fallbackTermId,
    priority: isPriority(v.priority) ? v.priority : "medium",
    completed: v.completed === true,
    createdAt: isoOrUndef(v.createdAt) ?? new Date().toISOString(),
  };
  const courseId = str(v.courseId);
  const dueAt = isoOrUndef(v.dueAt);
  const linkedTaskId = str(v.linkedTaskId);
  if (courseId) task.courseId = courseId;
  if (dueAt) task.dueAt = dueAt;
  if (typeof v.estimatedMinutes === "number" && v.estimatedMinutes >= 0) {
    task.estimatedMinutes = v.estimatedMinutes;
  }
  if (typeof v.loggedMinutes === "number" && v.loggedMinutes >= 0) {
    task.loggedMinutes = v.loggedMinutes;
  }
  if (typeof v.notes === "string") task.notes = v.notes;
  if (task.completed && isoOrUndef(v.completedAt)) {
    task.completedAt = v.completedAt as string;
  }
  if (linkedTaskId) task.linkedTaskId = linkedTaskId;
  return task;
}

const ARTIFACT_KINDS: ArtifactKind[] = ["note", "transcript", "audio"];
function isArtifactKind(v: unknown): v is ArtifactKind {
  return typeof v === "string" && (ARTIFACT_KINDS as string[]).includes(v);
}

function coerceArtifact(value: unknown, fallbackTermId: string): Artifact | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (!str(v.id) || !str(v.courseId)) return null;
  const now = new Date().toISOString();
  const artifact: Artifact = {
    id: v.id as string,
    courseId: v.courseId as string,
    termId: str(v.termId) ?? fallbackTermId,
    kind: isArtifactKind(v.kind) ? v.kind : "note",
    title: str(v.title) ?? "Untitled",
    content: typeof v.content === "string" ? v.content : "",
    createdAt: isoOrUndef(v.createdAt) ?? now,
    updatedAt: isoOrUndef(v.updatedAt) ?? now,
  };
  const audioId = str(v.audioId);
  const mimeType = str(v.mimeType);
  if (audioId) artifact.audioId = audioId;
  if (typeof v.durationMs === "number" && v.durationMs >= 0) {
    artifact.durationMs = v.durationMs;
  }
  if (mimeType) artifact.mimeType = mimeType;
  return artifact;
}

function coerceSettings(value: unknown, currentTermId: string): Settings {
  const v = (value && typeof value === "object" ? value : {}) as Record<
    string,
    unknown
  >;
  const theme =
    v.theme === "light" || v.theme === "dark" || v.theme === "system"
      ? v.theme
      : "system";
  const density = v.density === "compact" ? "compact" : "comfortable";
  return {
    theme,
    density,
    currentTermId: str(v.currentTermId) ?? currentTermId,
    ollamaUrl: str(v.ollamaUrl) ?? DEFAULT_OLLAMA_URL,
    ollamaModel: str(v.ollamaModel) ?? DEFAULT_OLLAMA_MODEL,
  };
}

/**
 * Migrate any historical shape to the current schema.
 * v1 stored only `tasks` with a free-text `course` string; we lift those
 * strings into real Course records and attach a default term.
 */
function migrate(raw: unknown): StoreState {
  const doc = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;

  // Terms (create a default if none exist).
  let terms = Array.isArray(doc.terms)
    ? doc.terms.map(coerceTerm).filter((t): t is Term => t !== null)
    : [];
  if (terms.length === 0) {
    terms = [{ id: "term-1", name: "Current term" }];
  }
  const fallbackTermId = terms[0].id;

  const version = typeof doc.version === "number" ? doc.version : 1;
  const rawTasks = Array.isArray(doc.tasks) ? doc.tasks : [];

  let courses = Array.isArray(doc.courses)
    ? doc.courses
        .map((c) => coerceCourse(c, fallbackTermId))
        .filter((c): c is Course => c !== null)
    : [];

  const tasks = rawTasks
    .map((t) => coerceTask(t, fallbackTermId))
    .filter((t): t is Task => t !== null);

  // v1 → v2: derive courses from legacy free-text `course` labels.
  if (version < 2) {
    const byLabel = new Map<string, Course>();
    let colorIdx = 0;
    for (const raw2 of rawTasks) {
      const label =
        raw2 && typeof raw2 === "object"
          ? str((raw2 as Record<string, unknown>).course)
          : undefined;
      if (label && !byLabel.has(label)) {
        const course: Course = {
          id: `course-${byLabel.size + 1}`,
          name: label,
          code: label,
          color: COURSE_PALETTE[colorIdx % COURSE_PALETTE.length],
          termId: fallbackTermId,
          meetingDays: [],
          archived: false,
          createdAt: new Date().toISOString(),
        };
        colorIdx += 1;
        byLabel.set(label, course);
      }
    }
    courses = [...courses, ...byLabel.values()];
    // Link tasks to the derived courses by their original label.
    for (let i = 0; i < tasks.length; i += 1) {
      const original = rawTasks[i] as Record<string, unknown> | undefined;
      const label = original ? str(original.course) : undefined;
      if (label && byLabel.has(label)) {
        tasks[i].courseId = byLabel.get(label)!.id;
      }
    }
  }

  const artifacts = Array.isArray(doc.artifacts)
    ? doc.artifacts
        .map((a) => coerceArtifact(a, fallbackTermId))
        .filter((a): a is Artifact => a !== null)
    : [];

  const settings = coerceSettings(doc.settings, fallbackTermId);
  // Ensure currentTermId points to a real term.
  if (!terms.some((t) => t.id === settings.currentTermId)) {
    settings.currentTermId = fallbackTermId;
  }

  return {
    version: CURRENT_SCHEMA_VERSION,
    terms,
    courses,
    tasks,
    artifacts,
    settings,
  };
}

export function loadState(): StoreState {
  if (typeof window === "undefined") {
    return createSeedState();
  }

  const initialized = window.localStorage.getItem(INIT_KEY) === "true";
  const rawString = window.localStorage.getItem(STORAGE_KEY);

  if (rawString === null) {
    if (!initialized) {
      const seeded = createSeedState();
      saveState(seeded);
      return seeded;
    }
    return migrate({ version: CURRENT_SCHEMA_VERSION });
  }

  try {
    return migrate(JSON.parse(rawString));
  } catch {
    try {
      window.localStorage.setItem(`${STORAGE_KEY}.corrupt`, rawString);
    } catch {
      /* ignore backup quota errors */
    }
    const seeded = createSeedState();
    saveState(seeded);
    return seeded;
  }
}

export function saveState(state: StoreState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.localStorage.setItem(INIT_KEY, "true");
  } catch {
    /* storage full/unavailable: keep working from memory */
  }
}

export function resetToDemo(): StoreState {
  const seeded = createSeedState();
  saveState(seeded);
  return seeded;
}

export function clearAll(current: StoreState): StoreState {
  const cleared: StoreState = { ...current, tasks: [] };
  saveState(cleared);
  return cleared;
}

export function exportJSON(state: StoreState): string {
  return JSON.stringify(state, null, 2);
}

export function importJSON(text: string): StoreState {
  return migrate(JSON.parse(text));
}

export { migrate as migrateState };
