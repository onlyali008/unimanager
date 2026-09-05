"use client";

import { useMemo } from "react";
import { useStore } from "@/hooks/useStore";
import { coursesInTerm, formatDuration, tasksInTerm } from "@/lib/tasks";
import { computeCourseGrade, computeTermGpa } from "@/lib/grades";
import { focusStats } from "@/lib/focus";

function pct(done: number, total: number): number {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

export default function ProgressPage() {
  const { tasks, courses, focusLog, settings, ready } = useStore();
  const termId = settings.currentTermId;

  const focus = useMemo(() => focusStats(focusLog), [focusLog]);

  const termTasks = useMemo(() => tasksInTerm(tasks, termId), [tasks, termId]);
  const termCourses = useMemo(
    () => coursesInTerm(courses, termId).filter((c) => !c.archived),
    [courses, termId],
  );

  const overall = useMemo(() => {
    const total = termTasks.length;
    const done = termTasks.filter((t) => t.completed).length;
    return { total, done, percent: pct(done, total) };
  }, [termTasks]);

  const termGpa = useMemo(() => computeTermGpa(termCourses), [termCourses]);

  const perCourse = useMemo(() => {
    return termCourses.map((course) => {
      const items = termTasks.filter((t) => t.courseId === course.id);
      const done = items.filter((t) => t.completed).length;
      return {
        course,
        total: items.length,
        done,
        percent: pct(done, items.length),
        grade: computeCourseGrade(course),
      };
    });
  }, [termCourses, termTasks]);

  const uncategorized = useMemo(() => {
    const items = termTasks.filter((t) => !t.courseId);
    const done = items.filter((t) => t.completed).length;
    return { total: items.length, done, percent: pct(done, items.length) };
  }, [termTasks]);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Progress</p>
          <h1 className="page-title">Where things stand</h1>
          <p className="page-subtitle">
            Task completion for this term, by course.
          </p>
        </div>
      </header>

      {!ready ? (
        <p className="muted-note">Loading…</p>
      ) : termCourses.length === 0 && termTasks.length === 0 ? (
        <p className="muted-note">No courses or tasks in this term yet.</p>
      ) : (
        <>
          {focus.weekMinutes > 0 && (
            <section className="card focus-stats" aria-label="Study focus">
              <div className="focus-stat">
                <span className="focus-stat-value">
                  {focus.streakDays}
                  <span className="focus-stat-unit">
                    {focus.streakDays === 1 ? " day" : " days"}
                  </span>
                </span>
                <span className="summary-label">Focus streak 🔥</span>
              </div>
              <div className="focus-stat">
                <span className="focus-stat-value">
                  {formatDuration(focus.weekMinutes) ?? "0m"}
                </span>
                <span className="summary-label">This week</span>
              </div>
              <div className="focus-stat">
                <span className="focus-stat-value">
                  {formatDuration(focus.todayMinutes) ?? "0m"}
                </span>
                <span className="summary-label">Today</span>
              </div>
            </section>
          )}

          {termGpa.gpa !== null && (
            <section className="card gpa-card" aria-label="Term GPA">
              <div className="progress-head">
                <h2 className="group-title">Term GPA (4.0 scale)</h2>
                <span className="gpa-figure">{termGpa.gpa.toFixed(2)}</span>
              </div>
              <p className="muted-note">
                Across {termGpa.gradedCourses}{" "}
                {termGpa.gradedCourses === 1 ? "course" : "courses"} with grades
                ({termGpa.gradedCredits} credits). Enter category grades on a
                course to include it.
              </p>
            </section>
          )}

          {termTasks.length > 0 && (
          <section className="card progress-overall">
            <div className="progress-head">
              <h2 className="group-title">Term completion</h2>
              <span className="progress-figure">{overall.percent}%</span>
            </div>
            <ProgressBar
              percent={overall.percent}
              color="var(--accent)"
              label="Term completion"
            />
            <p className="muted-note">
              {overall.done} of {overall.total} tasks completed.
            </p>
          </section>
          )}

          <section aria-label="By course" className="progress-list">
            {perCourse.map(({ course, total, done, percent, grade }) => (
              <div key={course.id} className="card progress-row">
                <div className="progress-head">
                  <div>
                    <p className="course-code" style={{ color: course.color }}>
                      {course.code || "—"}
                    </p>
                    <h3 className="course-name">{course.name}</h3>
                  </div>
                  <span className="progress-figure">{percent}%</span>
                </div>
                <ProgressBar
                  percent={percent}
                  color={course.color}
                  label={`${course.name} completion`}
                />
                <div className="course-stats">
                  <span className="muted-note">
                    {done} of {total} tasks completed
                  </span>
                  {grade.hasGrades && (
                    <span className="chip grade-chip">
                      {grade.letter} · {grade.earnedPercent?.toFixed(1)}%
                      {grade.gpaPoints !== null
                        ? ` · GPA ${grade.gpaPoints.toFixed(1)}`
                        : ""}
                    </span>
                  )}
                  {course.targetGrade && (
                    <span className="chip">Target {course.targetGrade}%</span>
                  )}
                </div>
              </div>
            ))}

            {uncategorized.total > 0 && (
              <div className="card progress-row">
                <div className="progress-head">
                  <h3 className="course-name">No course</h3>
                  <span className="progress-figure">
                    {uncategorized.percent}%
                  </span>
                </div>
                <ProgressBar
                  percent={uncategorized.percent}
                  color="var(--muted)"
                  label="Tasks with no course, completion"
                />
                <p className="muted-note">
                  {uncategorized.done} of {uncategorized.total} tasks completed
                </p>
              </div>
            )}
          </section>

          <p className="muted-note progress-note">
            These figures reflect task completion only. Semestra does not
            calculate grades. &ldquo;Target grade&rdquo; is a note you set on a
            course, nothing more.
          </p>
        </>
      )}
    </div>
  );
}

function ProgressBar({
  percent,
  color,
  label,
}: {
  percent: number;
  color: string;
  label: string;
}) {
  return (
    <div
      className="progress-bar"
      role="progressbar"
      aria-label={label}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span
        className="progress-fill"
        style={{ width: `${percent}%`, backgroundColor: color }}
      />
    </div>
  );
}
