"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useStore } from "@/hooks/useStore";
import {
  formatDue,
  sortTasks,
  tasksInTerm,
  WEEKDAY_LABELS,
} from "@/lib/tasks";

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { courses, tasks, ready, patchCourse, toggleComplete } = useStore();

  const course = courses.find((c) => c.id === id);
  const courseTasks = useMemo(() => {
    if (!course) return [];
    return sortTasks(
      tasksInTerm(tasks, course.termId).filter((t) => t.courseId === id),
    );
  }, [tasks, course, id]);

  if (!ready) {
    return (
      <div className="page">
        <p className="muted-note">Loading…</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="page">
        <p className="eyebrow">Course</p>
        <h1 className="page-title">Course not found</h1>
        <p className="muted-note">
          This course may have been deleted.{" "}
          <Link href="/courses" className="course-name-link">
            Back to courses
          </Link>
          .
        </p>
      </div>
    );
  }

  const meeting =
    course.meetingDays.length > 0
      ? course.meetingDays.map((d) => WEEKDAY_LABELS[d]).join(", ") +
        (course.meetingStart
          ? ` · ${course.meetingStart}${
              course.meetingEnd ? `–${course.meetingEnd}` : ""
            }`
          : "")
      : "No set meetings";

  return (
    <div className="page">
      <div>
        <Link href="/courses" className="back-link">
          ← Courses
        </Link>
      </div>

      <header
        className="course-detail-head"
        style={{ borderTopColor: course.color }}
      >
        <p className="course-code" style={{ color: course.color }}>
          {course.code || "—"}
        </p>
        <h1 className="page-title">{course.name}</h1>
        <p className="page-subtitle">{meeting}</p>
        {course.instructor && (
          <p className="muted-note">{course.instructor}</p>
        )}
      </header>

      <section className="card notes-section">
        <div className="notes-head">
          <h2 className="group-title">Notes</h2>
          <span className="muted-note notes-saved">Saved automatically</span>
        </div>
        <textarea
          className="field-input notes-area"
          value={course.notes ?? ""}
          onChange={(e) => patchCourse(course.id, { notes: e.target.value })}
          placeholder="Lecture notes, links, reminders, anything for this course…"
          aria-label={`Notes for ${course.name}`}
          rows={12}
        />
      </section>

      <section aria-label="Tasks for this course">
        <h2 className="group-title">
          Tasks
          <span className="group-count">{courseTasks.length}</span>
        </h2>
        {courseTasks.length === 0 ? (
          <p className="muted-note">No tasks for this course yet.</p>
        ) : (
          <ul className="task-list">
            {courseTasks.map((task) => (
              <li
                key={task.id}
                className="task-row"
                style={{ borderInlineStartColor: course.color }}
              >
                <input
                  type="checkbox"
                  className="task-check"
                  checked={task.completed}
                  onChange={() => toggleComplete(task.id)}
                  aria-label={
                    task.completed
                      ? `Mark "${task.title}" as not done`
                      : `Mark "${task.title}" as done`
                  }
                />
                <div className="task-main">
                  <span
                    className={task.completed ? "task-title done" : "task-title"}
                  >
                    {task.title}
                  </span>
                  <div className="task-meta">
                    <span className="task-due">{formatDue(task.dueAt)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
