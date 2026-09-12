"use client";

import { useMemo, useState } from "react";
import type { Task } from "@/lib/types";
import { useStore } from "@/hooks/useStore";
import {
  addDays,
  coursesInTerm,
  itemsForDay,
  monthGridDays,
  sameDay,
  startOfMonth,
  startOfWeek,
  tasksInTerm,
  WEEKDAY_LABELS,
  type CalendarItem,
} from "@/lib/tasks";
import { TaskForm } from "@/components/TaskForm";

type View = "week" | "month" | "agenda";

function dueAtFor(day: Date): string {
  const d = new Date(day);
  d.setHours(17, 0, 0, 0);
  return d.toISOString();
}

export default function CalendarPage() {
  const {
    tasks,
    courses,
    settings,
    ready,
    addTask,
    updateTask,
    patchTask,
    toggleComplete,
  } = useStore();
  const termId = settings.currentTermId;

  const [view, setView] = useState<View>("week");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(new Date()));
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultDue, setDefaultDue] = useState<string | undefined>(undefined);
  const [formKey, setFormKey] = useState(0);

  const termTasks = useMemo(() => tasksInTerm(tasks, termId), [tasks, termId]);
  const termCourses = useMemo(
    () => coursesInTerm(courses, termId),
    [courses, termId],
  );
  const activeCourses = useMemo(
    () => termCourses.filter((c) => !c.archived),
    [termCourses],
  );

  const today = new Date();

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const monthDays = useMemo(() => monthGridDays(monthAnchor), [monthAnchor]);
  const monthLabel = monthAnchor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const agendaDays = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: 14 }, (_, i) => addDays(start, i))
      .map((day) => ({ day, items: itemsForDay(day, termTasks, termCourses) }))
      .filter((d) => d.items.length > 0);
  }, [termTasks, termCourses]);

  const rangeLabel = `${weekStart.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })} – ${addDays(weekStart, 6).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })}`;

  function editTask(task: Task) {
    setEditingTask(task);
    setDefaultDue(undefined);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  }
  function addOnDay(day: Date) {
    setEditingTask(null);
    setDefaultDue(dueAtFor(day));
    setFormKey((k) => k + 1);
    setFormOpen(true);
  }

  function reschedule(taskId: string, day: Date) {
    const t = tasks.find((x) => x.id === taskId);
    if (!t) return;
    const nd = new Date(day);
    const base = t.dueAt ? new Date(t.dueAt) : null;
    if (base && !Number.isNaN(base.getTime())) {
      nd.setHours(base.getHours(), base.getMinutes(), 0, 0);
    } else {
      nd.setHours(17, 0, 0, 0);
    }
    patchTask(taskId, { dueAt: nd.toISOString() });
  }

  function renderItem(item: CalendarItem, wide: boolean) {
    if (item.kind === "task" && item.task) {
      const task = item.task;
      return (
        <li
          key={item.id}
          className={wide ? "cal-item wide interactive" : "cal-item interactive"}
          style={{ borderInlineStartColor: item.color }}
          data-kind="task"
          draggable={!wide}
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", task.id);
            e.dataTransfer.effectAllowed = "move";
          }}
        >
          <input
            type="checkbox"
            className="cal-check"
            checked={task.completed}
            onChange={() => toggleComplete(task.id)}
            aria-label={
              task.completed
                ? `Mark "${task.title}" not done`
                : `Mark "${task.title}" done`
            }
          />
          <button
            type="button"
            className="cal-open"
            onClick={() => editTask(task)}
          >
            <span className="cal-time">{item.timeLabel}</span>
            <span className={task.completed ? "cal-title done" : "cal-title"}>
              {item.title}
            </span>
          </button>
          {wide && <span className="chip">Due</span>}
        </li>
      );
    }
    return (
      <li
        key={item.id}
        className={wide ? "cal-item wide" : "cal-item"}
        style={{ borderInlineStartColor: item.color }}
        data-kind={item.kind}
      >
        <span className="cal-time">{item.timeLabel}</span>
        <span className="cal-title">{item.title}</span>
        {wide && <span className="chip">Class</span>}
      </li>
    );
  }

  function renderMonthItem(item: CalendarItem) {
    if (item.kind === "task" && item.task) {
      const task = item.task;
      return (
        <li key={item.id}>
          <button
            type="button"
            className={task.completed ? "month-item done" : "month-item"}
            style={{ borderInlineStartColor: item.color }}
            title={`${item.title} · ${item.timeLabel}`}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", task.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            onClick={() => editTask(task)}
          >
            {item.title}
          </button>
        </li>
      );
    }
    return (
      <li key={item.id}>
        <span
          className="month-item meeting"
          style={{ borderInlineStartColor: item.color }}
          title={`${item.title} · ${item.timeLabel}`}
        >
          {item.title}
        </span>
      </li>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Calendar</p>
          <h1 className="page-title">Plan your week</h1>
          <p className="page-subtitle">
            Class meetings, deadlines, and study sessions together. Click a task
            to edit it, or a day to add one.
          </p>
        </div>
        <div className="calendar-actions">
          <div className="view-toggle" role="group" aria-label="Calendar view">
            <button
              type="button"
              className={view === "week" ? "btn btn-primary" : "btn btn-ghost"}
              aria-pressed={view === "week"}
              onClick={() => setView("week")}
            >
              Week
            </button>
            <button
              type="button"
              className={view === "month" ? "btn btn-primary" : "btn btn-ghost"}
              aria-pressed={view === "month"}
              onClick={() => setView("month")}
            >
              Month
            </button>
            <button
              type="button"
              className={view === "agenda" ? "btn btn-primary" : "btn btn-ghost"}
              aria-pressed={view === "agenda"}
              onClick={() => setView("agenda")}
            >
              Agenda
            </button>
          </div>
          <button
            type="button"
            className="btn btn-ghost no-print"
            onClick={() => window.print()}
          >
            Print
          </button>
        </div>
      </header>

      {!ready ? (
        <p className="muted-note">Loading…</p>
      ) : view === "week" ? (
        <>
          <div className="week-nav">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setWeekStart((w) => addDays(w, -7))}
            >
              ← Previous
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setWeekStart(startOfWeek(new Date()))}
            >
              Today
            </button>
            <span className="week-range">{rangeLabel}</span>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setWeekStart((w) => addDays(w, 7))}
            >
              Next →
            </button>
          </div>

          <div className="week-grid">
            {weekDays.map((day) => {
              const items = itemsForDay(day, termTasks, termCourses);
              const isToday = sameDay(day, today);
              const key = day.toISOString();
              const classes = [
                "day-col",
                isToday ? "is-today" : "",
                dragOverKey === key ? "drag-over" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <section
                  key={key}
                  className={classes}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (dragOverKey !== key) setDragOverKey(key);
                  }}
                  onDragLeave={() => {
                    setDragOverKey((cur) => (cur === key ? null : cur));
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("text/plain");
                    setDragOverKey(null);
                    if (id) reschedule(id, day);
                  }}
                  aria-label={day.toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                >
                  <div className="day-head">
                    <span className="day-name">
                      {WEEKDAY_LABELS[day.getDay()]}
                    </span>
                    <span className="day-num">{day.getDate()}</span>
                    <button
                      type="button"
                      className="day-add"
                      onClick={() => addOnDay(day)}
                      aria-label={`Add a task due ${day.toLocaleDateString(
                        undefined,
                        { month: "long", day: "numeric" },
                      )}`}
                    >
                      +
                    </button>
                  </div>
                  <ul className="day-items">
                    {items.length === 0 ? (
                      <li className="day-empty" aria-hidden="true">
                        —
                      </li>
                    ) : (
                      items.map((item) => renderItem(item, false))
                    )}
                  </ul>
                </section>
              );
            })}
          </div>
        </>
      ) : view === "month" ? (
        <>
          <div className="week-nav">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() =>
                setMonthAnchor(
                  (m) => new Date(m.getFullYear(), m.getMonth() - 1, 1),
                )
              }
            >
              ← Previous
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setMonthAnchor(startOfMonth(new Date()))}
            >
              Today
            </button>
            <span className="week-range">{monthLabel}</span>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() =>
                setMonthAnchor(
                  (m) => new Date(m.getFullYear(), m.getMonth() + 1, 1),
                )
              }
            >
              Next →
            </button>
          </div>

          <div className="month-grid">
            <div className="month-weekdays" aria-hidden="true">
              {WEEKDAY_LABELS.map((l) => (
                <span key={l} className="month-weekday">
                  {l}
                </span>
              ))}
            </div>
            <div className="month-cells">
              {monthDays.map((day) => {
                const items = itemsForDay(day, termTasks, termCourses);
                const inMonth = day.getMonth() === monthAnchor.getMonth();
                const isToday = sameDay(day, today);
                const key = day.toISOString();
                const classes = [
                  "month-cell",
                  inMonth ? "" : "other-month",
                  isToday ? "is-today" : "",
                  dragOverKey === key ? "drag-over" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <div
                    key={key}
                    className={classes}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (dragOverKey !== key) setDragOverKey(key);
                    }}
                    onDragLeave={() =>
                      setDragOverKey((cur) => (cur === key ? null : cur))
                    }
                    onDrop={(e) => {
                      e.preventDefault();
                      const id = e.dataTransfer.getData("text/plain");
                      setDragOverKey(null);
                      if (id) reschedule(id, day);
                    }}
                  >
                    <div className="month-cell-head">
                      <span className="month-cell-num">{day.getDate()}</span>
                      <button
                        type="button"
                        className="day-add no-print"
                        onClick={() => addOnDay(day)}
                        aria-label={`Add a task due ${day.toLocaleDateString(
                          undefined,
                          { month: "long", day: "numeric" },
                        )}`}
                      >
                        +
                      </button>
                    </div>
                    <ul className="month-items">
                      {items.slice(0, 3).map((item) => renderMonthItem(item))}
                      {items.length > 3 && (
                        <li className="month-more">+{items.length - 3} more</li>
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="agenda">
          {agendaDays.length === 0 ? (
            <p className="muted-note">
              Nothing scheduled in the next two weeks.
            </p>
          ) : (
            agendaDays.map(({ day, items }) => (
              <section key={day.toISOString()} className="agenda-day">
                <h2 className="agenda-date">
                  {sameDay(day, today)
                    ? "Today"
                    : day.toLocaleDateString(undefined, {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                      })}
                </h2>
                <ul className="task-list">
                  {items.map((item) => renderItem(item, true))}
                </ul>
              </section>
            ))
          )}
        </div>
      )}

      <TaskForm
        key={`cal-form-${formKey}`}
        open={formOpen}
        editing={editingTask}
        defaultDueAt={defaultDue}
        courses={activeCourses}
        onSubmit={(draft) => {
          if (editingTask) updateTask(editingTask.id, draft);
          else addTask(draft);
          setFormOpen(false);
          setEditingTask(null);
        }}
        onClose={() => {
          setFormOpen(false);
          setEditingTask(null);
        }}
      />
    </div>
  );
}
