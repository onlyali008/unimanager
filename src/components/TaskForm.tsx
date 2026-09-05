"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Course, Priority, Task, TaskType } from "@/lib/types";
import {
  PRIORITIES,
  PRIORITY_LABELS,
  TASK_TYPES,
  TASK_TYPE_LABELS,
} from "@/lib/types";
import type { TaskDraft } from "@/hooks/useStore";

interface TaskFormProps {
  open: boolean;
  /** When present, the form edits this task; otherwise it creates a new one. */
  editing?: Task | null;
  /** Prefill the due date for a NEW task (ignored when editing). */
  defaultDueAt?: string;
  courses: Course[];
  onSubmit: (draft: TaskDraft) => void;
  onClose: () => void;
}

/** Convert an ISO datetime to the value a datetime-local input expects. */
function toLocalInput(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

export function TaskForm({
  open,
  editing,
  defaultDueAt,
  courses,
  onSubmit,
  onClose,
}: TaskFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const errorId = useId();

  // Initialized from props. The parent remounts this component (via `key`)
  // each time the form opens, so these initializers re-read `editing` without
  // needing an effect to sync state.
  const [title, setTitle] = useState(() => editing?.title ?? "");
  const [type, setType] = useState<TaskType>(() => editing?.type ?? "assignment");
  const [courseId, setCourseId] = useState(() => editing?.courseId ?? "");
  const [dueAt, setDueAt] = useState(() =>
    toLocalInput(editing?.dueAt ?? defaultDueAt),
  );
  const [priority, setPriority] = useState<Priority>(
    () => editing?.priority ?? "medium",
  );
  const [estimate, setEstimate] = useState(() =>
    editing?.estimatedMinutes ? String(editing.estimatedMinutes) : "",
  );
  const [notes, setNotes] = useState(() => editing?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  // Drive the native <dialog> so we get focus trapping + Escape for free.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Give the task a title.");
      return;
    }
    const minutes = estimate ? Number.parseInt(estimate, 10) : undefined;
    onSubmit({
      title: trimmed,
      type,
      courseId: courseId || undefined,
      dueAt: fromLocalInput(dueAt),
      priority,
      estimatedMinutes:
        minutes !== undefined && !Number.isNaN(minutes) && minutes >= 0
          ? minutes
          : undefined,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={onClose}
      className="semestra-dialog"
    >
      <form method="dialog" onSubmit={handleSubmit} className="dialog-body">
        <div className="dialog-header">
          <h2 id={titleId} className="text-lg font-semibold">
            {editing ? "Edit task" : "New task"}
          </h2>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <div className="dialog-grid">
          <div className="dialog-col-full">
            <label htmlFor={`${titleId}-title`} className="field-label">
              Title
            </label>
            <input
              id={`${titleId}-title`}
              className="field-input"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              autoFocus
              required
            />
            {error && (
              <p id={errorId} role="alert" className="field-error">
                {error}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={`${titleId}-type`} className="field-label">
              Type
            </label>
            <select
              id={`${titleId}-type`}
              className="field-input"
              value={type}
              onChange={(e) => setType(e.target.value as TaskType)}
            >
              {TASK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TASK_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor={`${titleId}-course`} className="field-label">
              Course
            </label>
            <select
              id={`${titleId}-course`}
              className="field-input"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="">No course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code ? `${c.code} — ${c.name}` : c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor={`${titleId}-due`} className="field-label">
              Due date &amp; time
            </label>
            <input
              id={`${titleId}-due`}
              type="datetime-local"
              className="field-input"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor={`${titleId}-priority`} className="field-label">
              Priority
            </label>
            <select
              id={`${titleId}-priority`}
              className="field-input"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor={`${titleId}-estimate`} className="field-label">
              Estimate (minutes)
            </label>
            <input
              id={`${titleId}-estimate`}
              type="number"
              min={0}
              step={5}
              className="field-input"
              value={estimate}
              onChange={(e) => setEstimate(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="dialog-col-full">
            <label htmlFor={`${titleId}-notes`} className="field-label">
              Notes
            </label>
            <textarea
              id={`${titleId}-notes`}
              className="field-input"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="dialog-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {editing ? "Save changes" : "Add task"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
