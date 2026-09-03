"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useStore } from "@/hooks/useStore";
import { ARTIFACT_KIND_LABELS } from "@/lib/types";
import {
  formatDue,
  sortTasks,
  tasksInTerm,
  WEEKDAY_LABELS,
} from "@/lib/tasks";
import { newId } from "@/lib/tasks";
import { putAudio } from "@/lib/audioStore";
import { AudioRecorder } from "@/components/AudioRecorder";
import { ArtifactViewer } from "@/components/ArtifactViewer";

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const {
    courses,
    tasks,
    artifacts,
    ready,
    patchCourse,
    toggleComplete,
    addArtifact,
    updateArtifact,
    deleteArtifact,
  } = useStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const course = courses.find((c) => c.id === id);

  const courseTasks = useMemo(() => {
    if (!course) return [];
    return sortTasks(
      tasksInTerm(tasks, course.termId).filter((t) => t.courseId === id),
    );
  }, [tasks, course, id]);

  const courseArtifacts = useMemo(
    () =>
      artifacts
        .filter((a) => a.courseId === id)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [artifacts, id],
  );

  const selected = courseArtifacts.find((a) => a.id === selectedId) ?? null;

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

  function announce(text: string) {
    setMessage(text);
  }

  function createNote() {
    if (!course) return;
    const a = addArtifact({
      courseId: course.id,
      termId: course.termId,
      kind: "note",
      title: "New note",
    });
    setSelectedId(a.id);
    announce("Note created.");
  }

  function createTranscript() {
    if (!course) return;
    const stamp = new Date().toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    const a = addArtifact({
      courseId: course.id,
      termId: course.termId,
      kind: "transcript",
      title: `Live transcript · ${stamp}`,
    });
    setSelectedId(a.id);
    announce("Transcript created. Press Start dictation.");
  }

  async function saveRecording(blob: Blob, durationMs: number, mime: string) {
    if (!course) return;
    const audioId = newId();
    try {
      await putAudio(audioId, blob);
      const stamp = new Date().toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      const a = addArtifact({
        courseId: course.id,
        termId: course.termId,
        kind: "audio",
        title: `Recording · ${stamp}`,
        audioId,
        durationMs,
        mimeType: mime,
      });
      setSelectedId(a.id);
      announce("Recording saved.");
    } catch {
      announce("Could not save the recording on this device.");
    }
  }

  function handleDeleteArtifact(artifactId: string) {
    deleteArtifact(artifactId);
    if (selectedId === artifactId) setSelectedId(null);
    announce("Artifact deleted.");
  }

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
        {course.instructor && <p className="muted-note">{course.instructor}</p>}
      </header>

      <div aria-live="polite" className="sr-only">
        {message}
      </div>

      <section className="card notes-section">
        <h2 className="group-title">Overview</h2>
        <textarea
          className="field-input notes-area"
          value={course.notes ?? ""}
          onChange={(e) => patchCourse(course.id, { notes: e.target.value })}
          placeholder="A quick summary for this course…"
          aria-label={`Overview notes for ${course.name}`}
          rows={4}
        />
      </section>

      <section aria-label="Artifacts">
        <div className="artifacts-head">
          <h2 className="group-title">
            Artifacts
            <span className="group-count">{courseArtifacts.length}</span>
          </h2>
          <div className="artifacts-actions">
            <button type="button" className="btn btn-ghost" onClick={createNote}>
              New note
            </button>
            <AudioRecorder onSave={saveRecording} />
            <button
              type="button"
              className="btn btn-ghost"
              onClick={createTranscript}
            >
              Live dictation
            </button>
          </div>
        </div>

        <p className="muted-note artifacts-hint">
          Notes, transcripts, and recordings for this course. Everything stays
          on your device.
        </p>

        <div className="artifacts-layout">
          {courseArtifacts.length === 0 ? (
            <p className="muted-note">
              No artifacts yet. Create a note, record a lecture, or start a live
              transcript.
            </p>
          ) : (
            <ul className="artifact-grid">
              {courseArtifacts.map((a) => {
                const preview =
                  a.kind === "audio"
                    ? "Audio recording"
                    : a.content.trim().split("\n")[0] || "Empty";
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      className={
                        a.id === selectedId
                          ? "artifact-card selected"
                          : "artifact-card"
                      }
                      onClick={() => setSelectedId(a.id)}
                      aria-pressed={a.id === selectedId}
                    >
                      <span className="artifact-badge" data-kind={a.kind}>
                        {ARTIFACT_KIND_LABELS[a.kind]}
                      </span>
                      <span className="artifact-card-title">{a.title}</span>
                      <span className="artifact-card-preview">{preview}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {selected && (
            <ArtifactViewer
              key={selected.id}
              artifact={selected}
              onUpdate={updateArtifact}
              onDelete={handleDeleteArtifact}
              onClose={() => setSelectedId(null)}
            />
          )}
        </div>
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
