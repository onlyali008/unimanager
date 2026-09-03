"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  detectCourses,
  detectTaskEvents,
  parseICS,
  type DetectedCourse,
  type DetectedTaskEvent,
} from "@/lib/ics";
import { WEEKDAY_LABELS } from "@/lib/tasks";
import type { ImportResult } from "@/hooks/useStore";

interface ImportDialogProps {
  open: boolean;
  onImport: (
    courses: DetectedCourse[],
    tasks: DetectedTaskEvent[],
    importTasks: boolean,
  ) => ImportResult;
  onClose: () => void;
}

export function ImportDialog({ open, onImport, onClose }: ImportDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  const [courses, setCourses] = useState<DetectedCourse[]>([]);
  const [taskEvents, setTaskEvents] = useState<DetectedTaskEvent[]>([]);
  const [importTasks, setImportTasks] = useState(true);
  const [parsed, setParsed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function handleText(text: string) {
    try {
      const events = parseICS(text);
      const detected = detectCourses(events);
      const tasks = detectTaskEvents(events);
      setCourses(detected);
      setTaskEvents(tasks);
      setParsed(true);
      if (detected.length === 0 && tasks.length === 0) {
        setError(
          "No recurring classes or dated assignments were found in that file.",
        );
      } else {
        setError(null);
      }
    } catch {
      setError("That file could not be read as a calendar (.ics).");
      setParsed(false);
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => handleText(String(reader.result));
    reader.readAsText(file);
    e.target.value = "";
  }

  function reset() {
    setCourses([]);
    setTaskEvents([]);
    setParsed(false);
    setError(null);
    setImportTasks(true);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={() => {
        reset();
        onClose();
      }}
      onCancel={() => {
        reset();
        onClose();
      }}
      className="semestra-dialog"
    >
      <div className="dialog-body">
        <div className="dialog-header">
          <h2 id={titleId} className="text-lg font-semibold">
            Import from calendar
          </h2>
          <button
            type="button"
            className="btn-icon"
            onClick={() => {
              reset();
              onClose();
            }}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <p className="muted-note">
          Export your timetable as an <code>.ics</code> file (Google Calendar,
          Outlook, or your school portal all support this) and load it here.
          Semestra reads it on your device — nothing is uploaded.
        </p>

        {!parsed ? (
          <div className="import-drop">
            <input
              ref={fileRef}
              type="file"
              accept=".ics,text/calendar"
              className="sr-only"
              onChange={handleFile}
              aria-label="Choose an .ics calendar file"
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => fileRef.current?.click()}
            >
              Choose .ics file
            </button>
            {error && (
              <p role="alert" className="field-error">
                {error}
              </p>
            )}
          </div>
        ) : (
          <>
            {courses.length > 0 && (
              <section>
                <h3 className="group-title">
                  Courses found
                  <span className="group-count">{courses.length}</span>
                </h3>
                <ul className="import-list">
                  {courses.map((c, i) => (
                    <li key={`${c.code}-${i}`} className="import-row">
                      <span className="import-title">
                        {c.code ? `${c.code} — ${c.name}` : c.name}
                      </span>
                      <span className="muted-note">
                        {c.meetingDays.length
                          ? c.meetingDays
                              .map((d) => WEEKDAY_LABELS[d])
                              .join(", ")
                          : "No days"}
                        {c.meetingStart ? ` · ${c.meetingStart}` : ""}
                        {c.meetingEnd ? `–${c.meetingEnd}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {taskEvents.length > 0 && (
              <section>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={importTasks}
                    onChange={(e) => setImportTasks(e.target.checked)}
                  />
                  <span>
                    Also import {taskEvents.length} dated{" "}
                    {taskEvents.length === 1 ? "assignment/exam" : "assignments/exams"}{" "}
                    as tasks
                  </span>
                </label>
              </section>
            )}

            {error && (
              <p role="alert" className="field-error">
                {error}
              </p>
            )}
          </>
        )}

        <div className="dialog-footer">
          {parsed && (
            <button type="button" className="btn btn-ghost" onClick={reset}>
              Choose a different file
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancel
          </button>
          {parsed && courses.length + (importTasks ? taskEvents.length : 0) > 0 && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                onImport(courses, taskEvents, importTasks);
                reset();
                onClose();
              }}
            >
              Import
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}
