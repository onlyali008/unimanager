"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/hooks/useStore";
import {
  addDays,
  coursesInTerm,
  itemsForDay,
  sameDay,
  startOfWeek,
  tasksInTerm,
  WEEKDAY_LABELS,
} from "@/lib/tasks";

type View = "week" | "agenda";

export default function CalendarPage() {
  const { tasks, courses, settings, ready } = useStore();
  const termId = settings.currentTermId;

  const [view, setView] = useState<View>("week");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const termTasks = useMemo(() => tasksInTerm(tasks, termId), [tasks, termId]);
  const termCourses = useMemo(
    () => coursesInTerm(courses, termId),
    [courses, termId],
  );

  const today = new Date();

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

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

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Calendar</p>
          <h1 className="page-title">Plan your week</h1>
          <p className="page-subtitle">
            Class meetings, deadlines, and study sessions together.
          </p>
        </div>
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
            className={view === "agenda" ? "btn btn-primary" : "btn btn-ghost"}
            aria-pressed={view === "agenda"}
            onClick={() => setView("agenda")}
          >
            Agenda
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
              return (
                <section
                  key={day.toISOString()}
                  className={isToday ? "day-col is-today" : "day-col"}
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
                  </div>
                  <ul className="day-items">
                    {items.length === 0 ? (
                      <li className="day-empty" aria-hidden="true">
                        —
                      </li>
                    ) : (
                      items.map((item) => (
                        <li
                          key={item.id}
                          className="cal-item"
                          style={{ borderInlineStartColor: item.color }}
                          data-kind={item.kind}
                        >
                          <span className="cal-time">{item.timeLabel}</span>
                          <span className="cal-title">{item.title}</span>
                        </li>
                      ))
                    )}
                  </ul>
                </section>
              );
            })}
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
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="cal-item wide"
                      style={{ borderInlineStartColor: item.color }}
                      data-kind={item.kind}
                    >
                      <span className="cal-time">{item.timeLabel}</span>
                      <span className="cal-title">{item.title}</span>
                      <span className="chip">
                        {item.kind === "meeting" ? "Class" : "Due"}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      )}
    </div>
  );
}
