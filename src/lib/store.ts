// External store for all Semestra data, read via useSyncExternalStore.

import type {
  Artifact,
  Course,
  Settings,
  StoreState,
  Task,
  Term,
} from "./types";
import { loadState, saveState } from "./storage";
import { createDemoState, createEmptyState } from "./seed";
import { deleteAudio } from "./audioStore";

/** Best-effort delete of audio blobs whose artifacts no longer exist. */
function cleanupAudio(oldArtifacts: Artifact[], nextArtifacts: Artifact[]): void {
  const keep = new Set(
    nextArtifacts.filter((a) => a.audioId).map((a) => a.audioId),
  );
  for (const a of oldArtifacts) {
    if (a.kind === "audio" && a.audioId && !keep.has(a.audioId)) {
      void deleteAudio(a.audioId).catch(() => {});
    }
  }
}

// Stable empty snapshot for SSR/hydration so server and client markup agree.
const SERVER_SNAPSHOT: StoreState = createEmptyState();

let current: StoreState | null = null;
const listeners = new Set<() => void>();

function ensureLoaded(): StoreState {
  if (current === null) current = loadState();
  return current;
}

function emit(): void {
  for (const listener of listeners) listener();
}

// Persistence is debounced: in-memory state and the UI update instantly on
// every change (cheap), but serializing the whole store to localStorage (the
// expensive part) is coalesced. A flush on tab-hide guarantees no lost writes.
const SAVE_DELAY = 400;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pending: StoreState | null = null;

function flushSave(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (pending) {
    saveState(pending);
    pending = null;
  }
}

function scheduleSave(next: StoreState): void {
  pending = next;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, SAVE_DELAY);
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flushSave);
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushSave();
  });
}

function commit(next: StoreState, immediate = false): void {
  current = next;
  if (immediate) {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    pending = null;
    saveState(next);
  } else {
    scheduleSave(next);
  }
  emit();
}

export function getSnapshot(): StoreState {
  return ensureLoaded();
}

export function getServerSnapshot(): StoreState {
  return SERVER_SNAPSHOT;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key && e.key.startsWith("semestra.")) {
      current = loadState();
      emit();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

/* --- Tasks --------------------------------------------------------- */
export function setTasks(tasks: Task[]): void {
  commit({ ...ensureLoaded(), tasks });
}

/** Shallow-patch a single task (used by drag-to-reschedule). */
export function patchTask(taskId: string, patch: Partial<Task>): void {
  const s = ensureLoaded();
  commit({
    ...s,
    tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
  });
}

/** Add focused minutes to a task's logged total (used by the study timer). */
export function logTaskMinutes(taskId: string, minutes: number): void {
  if (minutes <= 0) return;
  const s = ensureLoaded();
  commit({
    ...s,
    tasks: s.tasks.map((t) =>
      t.id === taskId
        ? { ...t, loggedMinutes: (t.loggedMinutes ?? 0) + minutes }
        : t,
    ),
  });
}

function todayKey(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Record focused minutes against today's date (for streaks/history). */
export function logFocus(minutes: number): void {
  if (minutes <= 0) return;
  const s = ensureLoaded();
  const date = todayKey();
  const existing = s.focusLog.find((e) => e.date === date);
  const focusLog = existing
    ? s.focusLog.map((e) =>
        e.date === date ? { ...e, minutes: e.minutes + minutes } : e,
      )
    : [...s.focusLog, { date, minutes }];
  commit({ ...s, focusLog });
}

/* --- Courses ------------------------------------------------------- */
export function setCourses(courses: Course[]): void {
  commit({ ...ensureLoaded(), courses });
}

/* --- Terms --------------------------------------------------------- */
export function setTerms(terms: Term[]): void {
  commit({ ...ensureLoaded(), terms });
}

/* --- Artifacts ----------------------------------------------------- */
export function setArtifacts(artifacts: Artifact[]): void {
  commit({ ...ensureLoaded(), artifacts });
}

/* --- Settings ------------------------------------------------------ */
export function setSettings(settings: Settings): void {
  commit({ ...ensureLoaded(), settings });
}

/* --- Whole-store operations (persist immediately) ------------------ */
export function resetDemoStore(): void {
  const old = ensureLoaded().artifacts;
  const seeded = createDemoState();
  cleanupAudio(old, seeded.artifacts);
  commit(seeded, true);
}

export function clearStore(): void {
  commit({ ...ensureLoaded(), tasks: [] }, true);
}

/** Remove all tasks, courses, and artifacts (keep terms + settings). */
export function startFresh(): void {
  const s = ensureLoaded();
  cleanupAudio(s.artifacts, []);
  commit({ ...s, tasks: [], courses: [], artifacts: [] }, true);
}

export function replaceStore(state: StoreState): void {
  const old = ensureLoaded().artifacts;
  cleanupAudio(old, state.artifacts);
  commit(state, true);
}
