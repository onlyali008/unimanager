"use client";

import { useCallback, useSyncExternalStore } from "react";
import type {
  Course,
  Settings,
  StoreState,
  Task,
  Term,
} from "@/lib/types";
import { COURSE_PALETTE } from "@/lib/types";
import * as store from "@/lib/store";
import { newId } from "@/lib/tasks";
import type { DetectedCourse, DetectedTaskEvent } from "@/lib/ics";

export interface ImportResult {
  courses: number;
  tasks: number;
}

export type TaskDraft = Omit<
  Task,
  "id" | "createdAt" | "completed" | "completedAt" | "termId" | "linkedTaskId"
>;

export type CourseDraft = Omit<Course, "id" | "createdAt" | "archived" | "termId">;

const noopSubscribe = () => () => {};

function snap(): StoreState {
  return store.getSnapshot();
}

export interface UseStore {
  ready: boolean;
  terms: Term[];
  courses: Course[];
  tasks: Task[];
  settings: Settings;

  addTask: (draft: TaskDraft) => Task;
  updateTask: (id: string, draft: TaskDraft) => void;
  toggleComplete: (id: string) => void;
  deleteTask: (id: string) => Task | undefined;
  restoreTask: (task: Task) => void;
  scheduleStudySession: (
    source: Task,
    dueAt: string,
    minutes: number | undefined,
  ) => void;

  addCourse: (draft: CourseDraft) => Course;
  updateCourse: (id: string, draft: CourseDraft) => void;
  patchCourse: (id: string, patch: Partial<Course>) => void;
  setCourseArchived: (id: string, archived: boolean) => void;
  deleteCourse: (id: string) => void;
  importCalendar: (
    courses: DetectedCourse[],
    tasks: DetectedTaskEvent[],
    importTasks: boolean,
  ) => ImportResult;

  addTerm: (name: string) => Term;
  setCurrentTerm: (id: string) => void;

  updateSettings: (patch: Partial<Settings>) => void;

  resetDemo: () => void;
  clear: () => void;
  replaceAll: (state: StoreState) => void;
}

export function useStore(): UseStore {
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const ready = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  const addTask = useCallback(
    (draft: TaskDraft): Task => {
      const task: Task = {
        ...draft,
        id: newId(),
        termId: snap().settings.currentTermId,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      store.setTasks([task, ...snap().tasks]);
      return task;
    },
    [],
  );

  const updateTask = useCallback((id: string, draft: TaskDraft) => {
    store.setTasks(
      snap().tasks.map((t) => (t.id === id ? { ...t, ...draft } : t)),
    );
  }, []);

  const toggleComplete = useCallback((id: string) => {
    store.setTasks(
      snap().tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              completed: !t.completed,
              completedAt: !t.completed ? new Date().toISOString() : undefined,
            }
          : t,
      ),
    );
  }, []);

  const deleteTask = useCallback((id: string): Task | undefined => {
    const removed = snap().tasks.find((t) => t.id === id);
    store.setTasks(snap().tasks.filter((t) => t.id !== id));
    return removed;
  }, []);

  const restoreTask = useCallback((task: Task) => {
    const existing = snap().tasks;
    if (existing.some((t) => t.id === task.id)) return;
    store.setTasks([task, ...existing]);
  }, []);

  const scheduleStudySession = useCallback(
    (source: Task, dueAt: string, minutes: number | undefined) => {
      const session: Task = {
        id: newId(),
        title: `Study: ${source.title}`,
        type: "study",
        termId: source.termId,
        courseId: source.courseId,
        dueAt,
        priority: "medium",
        estimatedMinutes: minutes,
        completed: false,
        linkedTaskId: source.id,
        createdAt: new Date().toISOString(),
      };
      store.setTasks([session, ...snap().tasks]);
    },
    [],
  );

  const addCourse = useCallback((draft: CourseDraft): Course => {
    const course: Course = {
      ...draft,
      id: newId(),
      termId: snap().settings.currentTermId,
      archived: false,
      createdAt: new Date().toISOString(),
    };
    store.setCourses([...snap().courses, course]);
    return course;
  }, []);

  const updateCourse = useCallback((id: string, draft: CourseDraft) => {
    store.setCourses(
      snap().courses.map((c) => (c.id === id ? { ...c, ...draft } : c)),
    );
  }, []);

  const patchCourse = useCallback((id: string, patch: Partial<Course>) => {
    store.setCourses(
      snap().courses.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
  }, []);

  const importCalendar = useCallback(
    (
      detectedCourses: DetectedCourse[],
      detectedTasks: DetectedTaskEvent[],
      importTasks: boolean,
    ): ImportResult => {
      const s = snap();
      const termId = s.settings.currentTermId;
      const now = new Date().toISOString();

      const newCourses: Course[] = detectedCourses.map((dc, i) => ({
        id: newId(),
        name: dc.name || dc.code || "Untitled course",
        code: dc.code,
        color: COURSE_PALETTE[(s.courses.length + i) % COURSE_PALETTE.length],
        termId,
        meetingDays: dc.meetingDays,
        meetingStart: dc.meetingStart,
        meetingEnd: dc.meetingEnd,
        instructor: undefined,
        notes: dc.location ? `Location: ${dc.location}` : undefined,
        archived: false,
        createdAt: now,
      }));

      // Link detected task events to a course by matching code, when possible.
      const codeToId = new Map<string, string>();
      for (const c of [...s.courses, ...newCourses]) {
        if (c.code) codeToId.set(c.code.toLowerCase(), c.id);
      }

      const newTasks: Task[] = importTasks
        ? detectedTasks.map((dt) => {
            const codeMatch = /^([A-Za-z]{2,}[\s-]?\d{2,}[A-Za-z]?)/.exec(
              dt.title,
            );
            const courseId = codeMatch
              ? codeToId.get(codeMatch[1].replace(/\s+/g, " ").toLowerCase())
              : undefined;
            return {
              id: newId(),
              title: dt.title,
              type: dt.type,
              termId,
              courseId,
              dueAt: dt.dueAt,
              priority: dt.type === "exam" ? "high" : "medium",
              completed: false,
              createdAt: now,
            };
          })
        : [];

      store.replaceStore({
        ...s,
        courses: [...s.courses, ...newCourses],
        tasks: [...newTasks, ...s.tasks],
      });

      return { courses: newCourses.length, tasks: newTasks.length };
    },
    [],
  );

  const setCourseArchived = useCallback((id: string, archived: boolean) => {
    store.setCourses(
      snap().courses.map((c) => (c.id === id ? { ...c, archived } : c)),
    );
  }, []);

  const deleteCourse = useCallback((id: string) => {
    const s = snap();
    store.replaceStore({
      ...s,
      courses: s.courses.filter((c) => c.id !== id),
      // Unlink tasks that referenced the deleted course; keep the tasks.
      tasks: s.tasks.map((t) =>
        t.courseId === id ? { ...t, courseId: undefined } : t,
      ),
    });
  }, []);

  const addTerm = useCallback((name: string): Term => {
    const term: Term = { id: newId(), name: name.trim() || "New term" };
    store.setTerms([...snap().terms, term]);
    return term;
  }, []);

  const setCurrentTerm = useCallback((id: string) => {
    store.setSettings({ ...snap().settings, currentTermId: id });
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    store.setSettings({ ...snap().settings, ...patch });
  }, []);

  const resetDemo = useCallback(() => store.resetDemoStore(), []);
  const clear = useCallback(() => store.clearStore(), []);
  const replaceAll = useCallback(
    (next: StoreState) => store.replaceStore(next),
    [],
  );

  return {
    ready,
    terms: state.terms,
    courses: state.courses,
    tasks: state.tasks,
    settings: state.settings,
    addTask,
    updateTask,
    toggleComplete,
    deleteTask,
    restoreTask,
    scheduleStudySession,
    addCourse,
    updateCourse,
    patchCourse,
    setCourseArchived,
    deleteCourse,
    importCalendar,
    addTerm,
    setCurrentTerm,
    updateSettings,
    resetDemo,
    clear,
    replaceAll,
  };
}
