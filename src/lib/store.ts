// External store for all Semestra data, read via useSyncExternalStore.

import type {
  Artifact,
  Course,
  Settings,
  StoreState,
  Task,
  Term,
} from "./types";
import { clearAll, loadState, resetToDemo, saveState } from "./storage";
import { createSeedState } from "./seed";

// Stable empty-ish snapshot for SSR/hydration. Uses the seed's shape but no
// data, so server and client initial markup agree.
const SERVER_SNAPSHOT: StoreState = {
  ...createSeedState(),
  tasks: [],
  courses: [],
  artifacts: [],
};

let current: StoreState | null = null;
const listeners = new Set<() => void>();

function ensureLoaded(): StoreState {
  if (current === null) current = loadState();
  return current;
}

function emit(): void {
  for (const listener of listeners) listener();
}

function commit(next: StoreState): void {
  current = next;
  saveState(next);
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

/* --- Whole-store operations --------------------------------------- */
export function resetDemoStore(): void {
  current = resetToDemo();
  emit();
}

export function clearStore(): void {
  current = clearAll(ensureLoaded());
  emit();
}

/** Remove all tasks, courses, and artifacts (keep terms + settings). */
export function startFresh(): void {
  const s = ensureLoaded();
  commit({ ...s, tasks: [], courses: [], artifacts: [] });
}

export function replaceStore(state: StoreState): void {
  commit(state);
}
