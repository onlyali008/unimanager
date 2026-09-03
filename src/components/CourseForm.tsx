"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Course } from "@/lib/types";
import { COURSE_PALETTE } from "@/lib/types";
import type { CourseDraft } from "@/hooks/useStore";
import { WEEKDAY_LABELS } from "@/lib/tasks";

interface CourseFormProps {
  open: boolean;
  editing?: Course | null;
  onSubmit: (draft: CourseDraft) => void;
  onClose: () => void;
}

export function CourseForm({
  open,
  editing,
  onSubmit,
  onClose,
}: CourseFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const errorId = useId();

  const [name, setName] = useState(() => editing?.name ?? "");
  const [code, setCode] = useState(() => editing?.code ?? "");
  const [instructor, setInstructor] = useState(() => editing?.instructor ?? "");
  const [color, setColor] = useState(() => editing?.color ?? COURSE_PALETTE[0]);
  const [days, setDays] = useState<number[]>(() => editing?.meetingDays ?? []);
  const [start, setStart] = useState(() => editing?.meetingStart ?? "");
  const [end, setEnd] = useState(() => editing?.meetingEnd ?? "");
  const [target, setTarget] = useState(() => editing?.targetGrade ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function toggleDay(day: number) {
    setDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort((a, b) => a - b),
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Give the course a name.");
      return;
    }
    onSubmit({
      name: trimmedName,
      code: code.trim(),
      instructor: instructor.trim() || undefined,
      color,
      meetingDays: days,
      meetingStart: start || undefined,
      meetingEnd: end || undefined,
      targetGrade: target.trim() || undefined,
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
            {editing ? "Edit course" : "New course"}
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
            <label htmlFor={`${titleId}-name`} className="field-label">
              Name
            </label>
            <input
              id={`${titleId}-name`}
              className="field-input"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
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
            <label htmlFor={`${titleId}-code`} className="field-label">
              Code
            </label>
            <input
              id={`${titleId}-code`}
              className="field-input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. CS 240"
            />
          </div>

          <div>
            <label htmlFor={`${titleId}-instructor`} className="field-label">
              Instructor
            </label>
            <input
              id={`${titleId}-instructor`}
              className="field-input"
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="dialog-col-full">
            <span className="field-label">Color</span>
            <div className="color-picker" role="radiogroup" aria-label="Course color">
              {COURSE_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={color === c}
                  aria-label={`Color ${c}`}
                  className={color === c ? "swatch selected" : "swatch"}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="dialog-col-full">
            <span className="field-label">Meeting days</span>
            <div className="day-picker">
              {WEEKDAY_LABELS.map((label, i) => (
                <label key={label} className="day-toggle">
                  <input
                    type="checkbox"
                    checked={days.includes(i)}
                    onChange={() => toggleDay(i)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor={`${titleId}-start`} className="field-label">
              Starts
            </label>
            <input
              id={`${titleId}-start`}
              type="time"
              className="field-input"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor={`${titleId}-end`} className="field-label">
              Ends
            </label>
            <input
              id={`${titleId}-end`}
              type="time"
              className="field-input"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor={`${titleId}-target`} className="field-label">
              Target grade
            </label>
            <input
              id={`${titleId}-target`}
              className="field-input"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="dialog-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {editing ? "Save changes" : "Add course"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
