"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Task } from "@/lib/types";
import { TASK_TYPES, TASK_TYPE_LABELS } from "@/lib/types";
import { useStore } from "@/hooks/useStore";
import * as timer from "@/lib/timerStore";
import {
  courseMap,
  coursesInTerm,
  daysUntil,
  dueBucket,
  filterTasks,
  formatDuration,
  itemsForDay,
  recommendTasks,
  relativeDays,
  sortTasks,
  summarize,
  tasksInTerm,
  totalEstimateMinutes,
  upcomingExams,
  type DueBucket,
  type TaskFilters,
} from "@/lib/tasks";
import { TaskForm } from "@/components/TaskForm";
import { TaskItem } from "@/components/TaskItem";
import { ScheduleDialog } from "@/components/ScheduleDialog";

function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const BUCKET_TITLES: Record<DueBucket, string> = {
  overdue: "Overdue",
  today: "Due today",
  upcoming: "Upcoming",
  someday: "No due date",
};
const BUCKET_ORDER: DueBucket[] = ["overdue", "today", "upcoming", "someday"];
const ONBOARDED_KEY = "semestra.onboarded";

export default function Dashboard() {
  const router = useRouter();
  const {
    tasks,
    courses,
    settings,
    ready,
    addTask,
    updateTask,
    toggleComplete,
    toggleSubtask,
    deleteTask,
    restoreTask,
    scheduleStudySession,
    resetDemo,
    startFresh,
  } = useStore();

  const termId = settings.currentTermId;
  const termTasks = useMemo(() => tasksInTerm(tasks, termId), [tasks, termId]);
  const termCourses = useMemo(
    () => coursesInTerm(courses, termId),
    [courses, termId],
  );
  const activeCourses = useMemo(
    () => termCourses.filter((c) => !c.archived),
    [termCourses],
  );
  const cmap = useMemo(() => courseMap(courses), [courses]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [quickTitle, setQuickTitle] = useState("");

  const [scheduleFor, setScheduleFor] = useState<Task | null>(null);
  const [scheduleKey, setScheduleKey] = useState(0);

  const [undo, setUndo] = useState<Task | null>(null);
  const [message, setMessage] = useState("");
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    },
    [],
  );

  // Dashboard keyboard shortcuts: "n" new task, "/" focus search.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (
        t instanceof HTMLElement &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      ) {
        return;
      }
      if (document.querySelector("dialog[open]")) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setEditing(null);
        setFormKey((k) => k + 1);
        setFormOpen(true);
      } else if (e.key === "/") {
        e.preventDefault();
        document.getElementById("search")?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const [welcomeDismissed, setWelcomeDismissed] = useState(() => {
    try {
      return (
        typeof window !== "undefined" &&
        window.localStorage.getItem(ONBOARDED_KEY) === "true"
      );
    } catch {
      return false;
    }
  });

  const [filters, setFilters] = useState<TaskFilters>({
    search: "",
    courseId: "all",
    type: "all",
    status: "all",
  });

  const summary = useMemo(() => summarize(termTasks), [termTasks]);
  const filtered = useMemo(
    () => filterTasks(termTasks, filters, courses),
    [termTasks, filters, courses],
  );
  const todayItems = useMemo(
    () => itemsForDay(new Date(), termTasks, termCourses),
    [termTasks, termCourses],
  );
  const recommended = useMemo(() => recommendTasks(termTasks), [termTasks]);
  const exams = useMemo(() => upcomingExams(termTasks), [termTasks]);
  const todayEstimate = useMemo(
    () =>
      totalEstimateMinutes(
        termTasks.filter((t) => !t.completed && dueBucket(t) === "today"),
      ),
    [termTasks],
  );

  const activeByBucket = useMemo(() => {
    const map: Record<DueBucket, Task[]> = {
      overdue: [],
      today: [],
      upcoming: [],
      someday: [],
    };
    for (const t of filtered) {
      if (t.completed) continue;
      map[dueBucket(t)].push(t);
    }
    for (const k of BUCKET_ORDER) map[k] = sortTasks(map[k]);
    return map;
  }, [filtered]);

  const completed = useMemo(
    () => sortTasks(filtered.filter((t) => t.completed)),
    [filtered],
  );

  const totalActiveShown = BUCKET_ORDER.reduce(
    (n, k) => n + activeByBucket[k].length,
    0,
  );

  const showWelcome =
    ready && !welcomeDismissed && tasks.some((t) => t.id.startsWith("seed-"));

  function dismissWelcome() {
    setWelcomeDismissed(true);
    try {
      window.localStorage.setItem(ONBOARDED_KEY, "true");
    } catch {
      /* ignore */
    }
  }

  function openNew() {
    setEditing(null);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  }
  function openEdit(task: Task) {
    setEditing(task);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  }
  function openSchedule(task: Task) {
    setScheduleFor(task);
    setScheduleKey((k) => k + 1);
  }

  function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    const title = quickTitle.trim();
    if (!title) return;
    addTask({ title, type: "assignment", priority: "medium" });
    setQuickTitle("");
    announce("Task added.");
  }

  function startTimerOn(task: Task) {
    timer.selectTask(task.id);
    timer.start();
    router.push("/timer");
  }

  function handleSubmit(draft: Parameters<typeof addTask>[0]) {
    if (editing) {
      updateTask(editing.id, draft);
      announce("Task updated.");
    } else {
      addTask(draft);
      announce("Task added.");
    }
    setFormOpen(false);
    setEditing(null);
  }

  function announce(text: string) {
    setMessage(text);
  }

  function handleDelete(id: string) {
    const removed = deleteTask(id);
    if (!removed) return;
    setUndo(removed);
    announce(`Deleted "${removed.title}". Undo available.`);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), 7000);
  }

  function handleUndo() {
    if (!undo) return;
    restoreTask(undo);
    announce(`Restored "${undo.title}".`);
    setUndo(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="page-title">{greeting()}. Here&apos;s your semester.</h1>
          <p className="page-subtitle">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openNew}>
          + New task
        </button>
      </header>

      <div aria-live="polite" className="sr-only">
        {message}
      </div>

      {showWelcome && (
        <section className="welcome-banner card" aria-label="Welcome">
          <div>
            <h2 className="welcome-title">Welcome to Semestra 👋</h2>
            <p className="muted-note">
              You&apos;re looking at example data so you can explore. When
              you&apos;re ready, start fresh and add your own courses and tasks.
            </p>
          </div>
          <div className="welcome-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                startFresh();
                dismissWelcome();
                announce("Cleared example data. Add your own to begin.");
              }}
            >
              Start fresh
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={dismissWelcome}
            >
              Keep exploring
            </button>
          </div>
        </section>
      )}

      <section aria-label="Summary" className="summary-grid">
        <SummaryCard label="Overdue" value={summary.overdue} tone="danger" />
        <SummaryCard label="Due today" value={summary.today} tone="warning" />
        <SummaryCard label="Upcoming" value={summary.upcoming} tone="neutral" />
        <SummaryCard
          label="Completed"
          value={summary.completed}
          tone="success"
        />
      </section>

      {recommended.length > 0 && (
        <section aria-label="Focus now" className="focus-card card">
          <h2 className="group-title">Focus now</h2>
          <ul className="focus-list">
            {recommended.map((task) => {
              const course = task.courseId ? cmap.get(task.courseId) : undefined;
              return (
                <li key={task.id} className="focus-item">
                  <div className="focus-main">
                    <span className="focus-title">{task.title}</span>
                    <span className="focus-meta">
                      {course ? `${course.code || course.name} · ` : ""}
                      {task.dueAt ? relativeDays(task.dueAt) : "no due date"}
                    </span>
                  </div>
                  <div className="focus-actions">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => startTimerOn(task)}
                    >
                      Start timer
                    </button>
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => {
                        toggleComplete(task.id);
                        announce(`Completed "${task.title}".`);
                      }}
                      aria-label={`Mark "${task.title}" done`}
                    >
                      Done
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {exams.length > 0 && (
        <section aria-label="Exams" className="exam-strip card">
          <h2 className="group-title">Exams ahead</h2>
          <ul className="exam-list">
            {exams.map((task) => {
              const course = task.courseId ? cmap.get(task.courseId) : undefined;
              const d = daysUntil(task.dueAt as string);
              return (
                <li key={task.id} className="exam-item" data-soon={d <= 3}>
                  <span
                    className="exam-course"
                    style={{ color: course?.color }}
                  >
                    {course?.code || "Exam"}
                  </span>
                  <span className="exam-title">{task.title}</span>
                  <span className="exam-when">
                    {relativeDays(task.dueAt as string)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-label="Today" className="today-card card">
        <div className="today-head">
          <h2 className="group-title">Today&apos;s schedule</h2>
          {todayEstimate > 0 && (
            <span className="today-workload">
              ~{formatDuration(todayEstimate)} of work due
            </span>
          )}
        </div>
        {todayItems.length === 0 ? (
          <p className="muted-note">Nothing scheduled today.</p>
        ) : (
          <ul className="today-list">
            {todayItems.map((item) => (
              <li key={item.id} className="today-item">
                <span
                  className="today-swatch"
                  style={{ backgroundColor: item.color }}
                  aria-hidden="true"
                />
                <span className="today-time">{item.timeLabel}</span>
                <span className="today-title">{item.title}</span>
                <span className="chip">
                  {item.kind === "meeting" ? "Class" : "Due"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form className="quick-add card" onSubmit={handleQuickAdd}>
        <label htmlFor="quick-add" className="sr-only">
          Quick add a task
        </label>
        <input
          id="quick-add"
          className="field-input quick-add-input"
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder="Add a task and press Enter…"
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!quickTitle.trim()}
        >
          Add
        </button>
        <button type="button" className="btn btn-ghost" onClick={openNew}>
          More options
        </button>
      </form>

      <section aria-label="Filters" className="filters card">
        <div className="filter-field filter-search">
          <label htmlFor="search" className="field-label">
            Search
          </label>
          <input
            id="search"
            type="search"
            className="field-input"
            placeholder="Search tasks, courses, notes…"
            value={filters.search}
            onChange={(e) =>
              setFilters((f) => ({ ...f, search: e.target.value }))
            }
          />
        </div>
        <div className="filter-field">
          <label htmlFor="f-status" className="field-label">
            Status
          </label>
          <select
            id="f-status"
            className="field-input"
            value={filters.status}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                status: e.target.value as TaskFilters["status"],
              }))
            }
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="f-course" className="field-label">
            Course
          </label>
          <select
            id="f-course"
            className="field-input"
            value={filters.courseId}
            onChange={(e) =>
              setFilters((f) => ({ ...f, courseId: e.target.value }))
            }
          >
            <option value="all">All courses</option>
            {termCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code || c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="f-type" className="field-label">
            Type
          </label>
          <select
            id="f-type"
            className="field-input"
            value={filters.type}
            onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
          >
            <option value="all">All types</option>
            {TASK_TYPES.map((t) => (
              <option key={t} value={t}>
                {TASK_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section id="task-list" className="task-area" aria-label="Tasks">
        {!ready ? (
          <p className="muted-note">Loading your tasks…</p>
        ) : termTasks.length === 0 ? (
          <EmptyState onAdd={openNew} onDemo={resetDemo} />
        ) : (
          <>
            {BUCKET_ORDER.map((bucket) =>
              activeByBucket[bucket].length > 0 ? (
                <TaskGroup
                  key={bucket}
                  title={BUCKET_TITLES[bucket]}
                  count={activeByBucket[bucket].length}
                  bucket={bucket}
                >
                  {activeByBucket[bucket].map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      course={task.courseId ? cmap.get(task.courseId) : undefined}
                      onToggle={toggleComplete}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                      onSchedule={openSchedule}
                      onToggleSubtask={toggleSubtask}
                    />
                  ))}
                </TaskGroup>
              ) : null,
            )}

            {filters.status !== "active" && completed.length > 0 && (
              <details className="completed-group">
                <summary>
                  Completed
                  <span className="group-count">{completed.length}</span>
                </summary>
                <ul className="task-list">
                  {completed.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      course={task.courseId ? cmap.get(task.courseId) : undefined}
                      onToggle={toggleComplete}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </ul>
              </details>
            )}

            {totalActiveShown === 0 &&
              (filters.status === "active" || completed.length === 0) && (
                <p className="muted-note">
                  {filters.search ||
                  filters.courseId !== "all" ||
                  filters.type !== "all" ||
                  filters.status !== "all"
                    ? "No tasks match these filters."
                    : "All caught up. Nothing left to do."}
                </p>
              )}
          </>
        )}
      </section>

      {undo && (
        <div className="undo-toast" role="status">
          <span>Task deleted.</span>
          <button type="button" className="btn btn-ghost" onClick={handleUndo}>
            Undo
          </button>
        </div>
      )}

      <TaskForm
        key={`task-form-${formKey}`}
        open={formOpen}
        editing={editing}
        courses={activeCourses}
        onSubmit={handleSubmit}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
      />

      <ScheduleDialog
        key={`sched-${scheduleKey}`}
        open={scheduleFor !== null}
        task={scheduleFor}
        onSubmit={(dueAt, minutes) => {
          if (scheduleFor) {
            scheduleStudySession(scheduleFor, dueAt, minutes);
            announce("Study session scheduled.");
          }
          setScheduleFor(null);
        }}
        onClose={() => setScheduleFor(null)}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "danger" | "warning" | "neutral" | "success";
}) {
  return (
    <div className="summary-card card" data-tone={tone}>
      <span className="summary-value">{value}</span>
      <span className="summary-label">{label}</span>
    </div>
  );
}

function TaskGroup({
  title,
  count,
  bucket,
  children,
}: {
  title: string;
  count: number;
  bucket: DueBucket;
  children: React.ReactNode;
}) {
  return (
    <section className="task-group" aria-label={title} data-bucket={bucket}>
      <h2 className="group-title">
        {title}
        <span className="group-count">{count}</span>
      </h2>
      <ul className="task-list">{children}</ul>
    </section>
  );
}

function EmptyState({
  onAdd,
  onDemo,
}: {
  onAdd: () => void;
  onDemo: () => void;
}) {
  return (
    <div className="empty-state card">
      <h2>No tasks in this term yet</h2>
      <p className="muted-note">
        Add your first assignment or exam, or load demo data to explore
        Semestra.
      </p>
      <div className="empty-actions">
        <button type="button" className="btn btn-primary" onClick={onAdd}>
          + New task
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDemo}>
          Load demo data
        </button>
      </div>
    </div>
  );
}
