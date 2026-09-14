"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Course } from "@/lib/types";
import { useStore } from "@/hooks/useStore";
import { CourseForm } from "@/components/CourseForm";
import { ImportDialog } from "@/components/ImportDialog";
import {
  coursesInTerm,
  formatDue,
  sortTasks,
  tasksInTerm,
  WEEKDAY_LABELS,
} from "@/lib/tasks";

export default function CoursesPage() {
  const {
    courses,
    tasks,
    settings,
    ready,
    addCourse,
    updateCourse,
    setCourseArchived,
    deleteCourse,
    importCalendar,
  } = useStore();
  const termId = settings.currentTermId;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importKey, setImportKey] = useState(0);
  const [message, setMessage] = useState("");

  const termCourses = useMemo(
    () => coursesInTerm(courses, termId),
    [courses, termId],
  );
  const termTasks = useMemo(() => tasksInTerm(tasks, termId), [tasks, termId]);

  const active = termCourses.filter((c) => !c.archived);
  const archived = termCourses.filter((c) => c.archived);

  function workload(courseId: string) {
    const items = termTasks.filter(
      (t) => t.courseId === courseId && !t.completed,
    );
    const next = sortTasks(items.filter((t) => t.dueAt))[0];
    return { open: items.length, next };
  }

  function openNew() {
    setEditing(null);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  }
  function openEdit(course: Course) {
    setEditing(course);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  }

  function meetingSummary(course: Course): string {
    if (course.meetingDays.length === 0) return "No set meetings";
    const days = course.meetingDays.map((d) => WEEKDAY_LABELS[d]).join(", ");
    if (course.meetingStart && course.meetingEnd) {
      return `${days} · ${course.meetingStart}–${course.meetingEnd}`;
    }
    return days;
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Courses</p>
          <h1 className="page-title">Your courses</h1>
          <p className="page-subtitle">
            Everything you&apos;re taking this term, with its live workload.
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setImportKey((k) => k + 1);
              setImportOpen(true);
            }}
          >
            Import from calendar
          </button>
          <button type="button" className="btn btn-primary" onClick={openNew}>
            + New course
          </button>
        </div>
      </header>

      <div aria-live="polite" className="sr-only">
        {message}
      </div>

      {!ready ? (
        <p className="muted-note">Loading…</p>
      ) : termCourses.length === 0 ? (
        <div className="empty-state card">
          <h2>No courses yet</h2>
          <p className="muted-note">
            Add the courses you&apos;re taking to group tasks and see your
            weekly schedule.
          </p>
          <div className="empty-actions">
            <button type="button" className="btn btn-primary" onClick={openNew}>
              + New course
            </button>
          </div>
        </div>
      ) : (
        <>
          <ul className="course-grid">
            {active.map((course) => {
              const { open, next } = workload(course.id);
              return (
                <li
                  key={course.id}
                  className="course-card card"
                  style={{ borderTopColor: course.color }}
                >
                  <div className="course-head">
                    <div>
                      <p className="course-code" style={{ color: course.color }}>
                        {course.code || "—"}
                      </p>
                      <h2 className="course-name">
                        <Link
                          href={`/course?id=${course.id}`}
                          className="course-name-link"
                        >
                          {course.name}
                        </Link>
                      </h2>
                      {course.instructor && (
                        <p className="muted-note">{course.instructor}</p>
                      )}
                    </div>
                    {course.targetGrade && (
                      <span className="chip">Target {course.targetGrade}</span>
                    )}
                  </div>

                  <p className="course-meeting">{meetingSummary(course)}</p>

                  <div className="course-stats">
                    <span>
                      <strong>{open}</strong> open{" "}
                      {open === 1 ? "task" : "tasks"}
                    </span>
                    {next && (
                      <span className="muted-note">
                        Next: {next.title} · {formatDue(next.dueAt)}
                      </span>
                    )}
                  </div>

                  <div className="course-actions">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => openEdit(course)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        setCourseArchived(course.id, true);
                        setMessage(`Archived ${course.name}.`);
                      }}
                    >
                      Archive
                    </button>
                    {confirmId === course.id ? (
                      <span className="confirm-inline">
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => {
                            deleteCourse(course.id);
                            setConfirmId(null);
                            setMessage(`Deleted ${course.name}.`);
                          }}
                        >
                          Confirm delete
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => setConfirmId(null)}
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => setConfirmId(course.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {archived.length > 0 && (
            <details className="completed-group">
              <summary>
                Archived
                <span className="group-count">{archived.length}</span>
              </summary>
              <ul className="course-grid">
                {archived.map((course) => (
                  <li key={course.id} className="course-card card archived">
                    <div className="course-head">
                      <div>
                        <p className="course-code">{course.code || "—"}</p>
                        <h2 className="course-name">{course.name}</h2>
                      </div>
                    </div>
                    <div className="course-actions">
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => {
                          setCourseArchived(course.id, false);
                          setMessage(`Restored ${course.name}.`);
                        }}
                      >
                        Unarchive
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}

      <CourseForm
        key={`course-form-${formKey}`}
        open={formOpen}
        editing={editing}
        onSubmit={(draft) => {
          if (editing) {
            updateCourse(editing.id, draft);
            setMessage("Course updated.");
          } else {
            addCourse(draft);
            setMessage("Course added.");
          }
          setFormOpen(false);
          setEditing(null);
        }}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
      />

      <ImportDialog
        key={`import-${importKey}`}
        open={importOpen}
        onImport={(detectedCourses, detectedTasks, withTasks) => {
          const result = importCalendar(
            detectedCourses,
            detectedTasks,
            withTasks,
          );
          setMessage(
            `Imported ${result.courses} ${
              result.courses === 1 ? "course" : "courses"
            }` +
              (result.tasks > 0 ? ` and ${result.tasks} tasks.` : "."),
          );
          return result;
        }}
        onClose={() => setImportOpen(false)}
      />
    </div>
  );
}
