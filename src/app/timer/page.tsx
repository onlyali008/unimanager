"use client";

import { useMemo } from "react";
import { useStore } from "@/hooks/useStore";
import { useTimer, formatClock } from "@/hooks/useTimer";
import { formatDuration, sortTasks, tasksInTerm } from "@/lib/tasks";

export default function TimerPage() {
  const { tasks, settings, ready } = useStore();
  const timer = useTimer();

  const openTasks = useMemo(
    () =>
      sortTasks(
        tasksInTerm(tasks, settings.currentTermId).filter((t) => !t.completed),
      ),
    [tasks, settings.currentTermId],
  );

  const selectedTask = tasks.find((t) => t.id === timer.taskId) ?? null;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Timer</p>
          <h1 className="page-title">Study timer</h1>
          <p className="page-subtitle">
            Focus in blocks. Completed focus time is logged to the task you pick.
          </p>
        </div>
      </header>

      {!ready ? (
        <p className="muted-note">Loading…</p>
      ) : (
        <>
          <section
            className="card timer-card"
            data-mode={timer.mode}
            aria-label="Timer"
          >
            <span className="timer-mode-label">
              {timer.mode === "focus" ? "Focus" : "Break"}
            </span>
            <span className="timer-clock" role="timer" aria-live="off">
              {formatClock(timer.remainingMs)}
            </span>
            <div className="timer-controls">
              <button
                type="button"
                className="btn btn-primary"
                onClick={timer.toggle}
              >
                {timer.running ? "Pause" : "Start"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={timer.skip}
              >
                Skip
              </button>
              {timer.mode === "focus" && timer.taskId ? (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={timer.logAndReset}
                >
                  Log &amp; reset
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={timer.reset}
                >
                  Reset
                </button>
              )}
            </div>
            <p className="muted-note">
              {timer.completedFocus} focus{" "}
              {timer.completedFocus === 1 ? "session" : "sessions"} completed
            </p>
          </section>

          <section className="card settings-section">
            <h2 className="group-title">Session</h2>
            <div className="settings-grid">
              <div>
                <label htmlFor="timer-task" className="field-label">
                  Working on
                </label>
                <select
                  id="timer-task"
                  className="field-input"
                  value={timer.taskId ?? ""}
                  onChange={(e) => timer.selectTask(e.target.value || null)}
                >
                  <option value="">No task (just a timer)</option>
                  {openTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
                {selectedTask?.loggedMinutes ? (
                  <p className="muted-note timer-logged">
                    {formatDuration(selectedTask.loggedMinutes)} logged so far
                  </p>
                ) : null}
              </div>
              <div className="timer-durations">
                <div>
                  <label htmlFor="focus-min" className="field-label">
                    Focus (min)
                  </label>
                  <input
                    id="focus-min"
                    type="number"
                    min={1}
                    max={180}
                    className="field-input"
                    value={timer.focusMin}
                    onChange={(e) =>
                      timer.setDurations(
                        Number(e.target.value) || timer.focusMin,
                        timer.breakMin,
                      )
                    }
                  />
                </div>
                <div>
                  <label htmlFor="break-min" className="field-label">
                    Break (min)
                  </label>
                  <input
                    id="break-min"
                    type="number"
                    min={1}
                    max={60}
                    className="field-input"
                    value={timer.breakMin}
                    onChange={(e) =>
                      timer.setDurations(
                        timer.focusMin,
                        Number(e.target.value) || timer.breakMin,
                      )
                    }
                  />
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
