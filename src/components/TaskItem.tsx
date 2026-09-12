"use client";

import type { Course, Task } from "@/lib/types";
import { RECURRENCE_LABELS, TASK_TYPE_LABELS } from "@/lib/types";
import { dueBucket, formatDuration, formatDue } from "@/lib/tasks";

interface TaskItemProps {
  task: Task;
  course?: Course;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onSchedule?: (task: Task) => void;
  onToggleSubtask?: (taskId: string, subId: string) => void;
}

const PRIORITY_DOT: Record<Task["priority"], string> = {
  high: "var(--danger)",
  medium: "var(--warning)",
  low: "var(--muted)",
};

const FALLBACK_COLOR = "#8a8577";

export function TaskItem({
  task,
  course,
  onToggle,
  onEdit,
  onDelete,
  onSchedule,
  onToggleSubtask,
}: TaskItemProps) {
  const bucket = task.completed ? "done" : dueBucket(task);
  const duration = formatDuration(task.estimatedMinutes);
  const accent = course?.color ?? FALLBACK_COLOR;
  const subs = task.subtasks ?? [];
  const doneSubs = subs.filter((s) => s.done).length;

  return (
    <li
      className="task-row"
      style={{ borderInlineStartColor: accent }}
      data-bucket={bucket}
    >
      <input
        type="checkbox"
        className="task-check"
        checked={task.completed}
        onChange={() => onToggle(task.id)}
        aria-label={
          task.completed
            ? `Mark "${task.title}" as not done`
            : `Mark "${task.title}" as done`
        }
      />

      <div className="task-main">
        <div className="task-title-row">
          <span className={task.completed ? "task-title done" : "task-title"}>
            {task.title}
          </span>
          <span
            className="priority-dot"
            style={{ backgroundColor: PRIORITY_DOT[task.priority] }}
            aria-hidden="true"
          />
          <span className="sr-only">{task.priority} priority</span>
        </div>

        <div className="task-meta">
          <span className="chip">{TASK_TYPE_LABELS[task.type]}</span>
          {course && (
            <span className="chip" style={{ color: accent }}>
              <span
                className="course-swatch"
                style={{ backgroundColor: accent }}
                aria-hidden="true"
              />
              {course.code || course.name}
            </span>
          )}
          <span className="task-due" data-bucket={bucket}>
            {bucket === "overdue" && !task.completed ? "Overdue · " : ""}
            {formatDue(task.dueAt)}
          </span>
          {task.recurrence && (
            <span className="chip" title={`Repeats ${RECURRENCE_LABELS[task.recurrence.freq]}`}>
              ↻ {RECURRENCE_LABELS[task.recurrence.freq]}
            </span>
          )}
          {duration && <span className="task-duration">· {duration}</span>}
          {subs.length > 0 && (
            <span className="chip" title="Checklist progress">
              ✓ {doneSubs}/{subs.length}
            </span>
          )}
          {task.loggedMinutes ? (
            <span className="task-logged">
              · {formatDuration(task.loggedMinutes)} logged
            </span>
          ) : null}
        </div>
        {subs.length > 0 && (
          <details className="subtask-view">
            <summary>Checklist</summary>
            <ul className="subtask-list">
              {subs.map((s) => (
                <li key={s.id} className="subtask-row">
                  <input
                    type="checkbox"
                    checked={s.done}
                    disabled={!onToggleSubtask}
                    onChange={() => onToggleSubtask?.(task.id, s.id)}
                    aria-label={`Mark step "${s.title}" ${
                      s.done ? "not done" : "done"
                    }`}
                  />
                  <span className={s.done ? "subtask-title done" : "subtask-title"}>
                    {s.title}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
        {task.notes && <p className="task-notes">{task.notes}</p>}
      </div>

      <div className="task-actions">
        {onSchedule && !task.completed && task.type !== "study" && (
          <button
            type="button"
            className="btn-icon"
            onClick={() => onSchedule(task)}
            aria-label={`Schedule a study session for "${task.title}"`}
          >
            Study
          </button>
        )}
        <button
          type="button"
          className="btn-icon"
          onClick={() => onEdit(task)}
          aria-label={`Edit "${task.title}"`}
        >
          Edit
        </button>
        <button
          type="button"
          className="btn-icon task-delete"
          onClick={() => onDelete(task.id)}
          aria-label={`Delete "${task.title}"`}
        >
          Delete
        </button>
      </div>
    </li>
  );
}
