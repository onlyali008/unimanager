"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Task } from "@/lib/types";

interface ScheduleDialogProps {
  open: boolean;
  task: Task | null;
  onSubmit: (dueAt: string, minutes: number | undefined) => void;
  onClose: () => void;
}

function defaultSlot(): string {
  // Tomorrow at 16:00 local, as a datetime-local value.
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(16, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function ScheduleDialog({
  open,
  task,
  onSubmit,
  onClose,
}: ScheduleDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [when, setWhen] = useState(defaultSlot);
  const [minutes, setMinutes] = useState(() =>
    task?.estimatedMinutes ? String(task.estimatedMinutes) : "60",
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const d = new Date(when);
    if (Number.isNaN(d.getTime())) return;
    const m = minutes ? Number.parseInt(minutes, 10) : undefined;
    onSubmit(d.toISOString(), m !== undefined && !Number.isNaN(m) ? m : undefined);
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
            Schedule study session
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

        {task && (
          <p className="muted-note">
            For <strong>{task.title}</strong>. This adds a study session to your
            plan and calendar.
          </p>
        )}

        <div className="dialog-grid">
          <div>
            <label htmlFor={`${titleId}-when`} className="field-label">
              When
            </label>
            <input
              id={`${titleId}-when`}
              type="datetime-local"
              className="field-input"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div>
            <label htmlFor={`${titleId}-min`} className="field-label">
              Duration (minutes)
            </label>
            <input
              id={`${titleId}-min`}
              type="number"
              min={5}
              step={5}
              className="field-input"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </div>
        </div>

        <div className="dialog-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Add session
          </button>
        </div>
      </form>
    </dialog>
  );
}
