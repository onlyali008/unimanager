"use client";

import { useRef, useState } from "react";
import type { Course, GradeBand, GradeCategory, GradeItem } from "@/lib/types";
import { DEFAULT_GRADE_SCALE } from "@/lib/types";
import { newId } from "@/lib/tasks";
import {
  computeCourseGrade,
  neededOnRemaining,
  parseGradingScheme,
  type DetectedCategory,
} from "@/lib/grades";
import { deleteFile, getFile, putFile } from "@/lib/fileStore";

interface CourseGradesProps {
  course: Course;
  onPatch: (patch: Partial<Course>) => void;
  onMessage: (text: string) => void;
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CourseGrades({ course, onPatch, onMessage }: CourseGradesProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [detectText, setDetectText] = useState("");
  const [detected, setDetected] = useState<DetectedCategory[] | null>(null);
  const categories = course.categories ?? [];
  const scale = course.gradeScale ?? DEFAULT_GRADE_SCALE;
  const grade = computeCourseGrade(course);

  const totalWeight = categories.reduce((s, c) => s + c.weight, 0);
  const targetNum = course.targetGrade ? Number(course.targetGrade) : NaN;
  const needed = Number.isFinite(targetNum)
    ? neededOnRemaining(course, targetNum)
    : null;

  function setCategories(next: GradeCategory[]) {
    onPatch({ categories: next });
  }

  function addCategory() {
    setCategories([
      ...categories,
      { id: newId(), name: "New category", weight: 0, items: [] },
    ]);
  }
  function updateCategory(id: string, patch: Partial<GradeCategory>) {
    setCategories(
      categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
  }
  function removeCategory(id: string) {
    setCategories(categories.filter((c) => c.id !== id));
  }
  function addItem(catId: string) {
    setCategories(
      categories.map((c) =>
        c.id === catId
          ? {
              ...c,
              items: [
                ...c.items,
                { id: newId(), name: "Item", score: null, outOf: 100 },
              ],
            }
          : c,
      ),
    );
  }
  function updateItem(catId: string, itemId: string, patch: Partial<GradeItem>) {
    setCategories(
      categories.map((c) =>
        c.id === catId
          ? {
              ...c,
              items: c.items.map((i) =>
                i.id === itemId ? { ...i, ...patch } : i,
              ),
            }
          : c,
      ),
    );
  }
  function applyDetected() {
    if (!detected) return;
    const existing = new Set(categories.map((c) => c.name.toLowerCase()));
    const toAdd: GradeCategory[] = detected
      .filter((d) => !existing.has(d.name.toLowerCase()))
      .map((d) => ({ id: newId(), name: d.name, weight: d.weight, items: [] }));
    if (toAdd.length) setCategories([...categories, ...toAdd]);
    onMessage(
      toAdd.length
        ? `Added ${toAdd.length} categor${toAdd.length === 1 ? "y" : "ies"} from the syllabus.`
        : "Those categories are already here.",
    );
    setDetected(null);
    setDetectText("");
  }

  function removeItem(catId: string, itemId: string) {
    setCategories(
      categories.map((c) =>
        c.id === catId
          ? { ...c, items: c.items.filter((i) => i.id !== itemId) }
          : c,
      ),
    );
  }

  async function handleSyllabus(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const fileId = newId();
    try {
      await putFile(fileId, file);
      if (course.syllabus) await deleteFile(course.syllabus.fileId).catch(() => {});
      onPatch({
        syllabus: {
          fileId,
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          uploadedAt: new Date().toISOString(),
        },
      });
      onMessage("Syllabus uploaded.");
    } catch {
      onMessage("Could not save the syllabus on this device.");
    }
  }

  async function openSyllabus() {
    if (!course.syllabus) return;
    try {
      const blob = await getFile(course.syllabus.fileId);
      if (!blob) {
        onMessage("Syllabus file is unavailable on this device.");
        return;
      }
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      onMessage("Could not open the syllabus.");
    }
  }

  async function removeSyllabus() {
    if (!course.syllabus) return;
    await deleteFile(course.syllabus.fileId).catch(() => {});
    onPatch({ syllabus: undefined });
    onMessage("Syllabus removed.");
  }

  return (
    <section className="card grades-section" aria-label="Grades">
      <div className="grades-head">
        <h2 className="group-title">Grades</h2>
        <div className="grade-figure-wrap">
          {grade.hasGrades ? (
            <>
              <span className="grade-letter">{grade.letter}</span>
              <span className="grade-percent">
                {grade.earnedPercent?.toFixed(1)}%
              </span>
              {grade.gpaPoints !== null && (
                <span className="chip">GPA {grade.gpaPoints.toFixed(1)}</span>
              )}
            </>
          ) : (
            <span className="muted-note">No grades entered yet</span>
          )}
        </div>
      </div>

      <p className="muted-note">
        Current grade is your weighted average over graded work only. It is not
        a prediction.
      </p>

      {/* Target + credits */}
      <div className="grades-meta">
        <div>
          <label htmlFor="target-grade" className="field-label">
            Target %
          </label>
          <input
            id="target-grade"
            type="number"
            min={0}
            max={100}
            className="field-input grades-narrow"
            value={course.targetGrade ?? ""}
            onChange={(e) => onPatch({ targetGrade: e.target.value })}
            placeholder="e.g. 85"
          />
        </div>
        <div>
          <label htmlFor="credits" className="field-label">
            Credits
          </label>
          <input
            id="credits"
            type="number"
            min={0}
            step={0.5}
            className="field-input grades-narrow"
            value={course.credits ?? ""}
            onChange={(e) =>
              onPatch({
                credits: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            placeholder="e.g. 3"
          />
        </div>
        {needed !== null && (
          <p className="grades-needed muted-note">
            {needed > 100
              ? `Reaching ${targetNum}% is no longer possible from remaining work.`
              : `Need ~${needed.toFixed(0)}% on the remaining ${grade.remainingWeight}% to hit ${targetNum}%.`}
          </p>
        )}
      </div>

      {/* Categories */}
      <div className="grade-cats">
        {categories.length === 0 && (
          <p className="muted-note">
            Add categories from your syllabus (e.g. Homework 20%, Midterm 30%,
            Final 50%).
          </p>
        )}
        {categories.map((cat) => {
          const items = cat.items;
          return (
            <div key={cat.id} className="grade-cat">
              <div className="grade-cat-head">
                <input
                  className="field-input grade-cat-name"
                  value={cat.name}
                  onChange={(e) =>
                    updateCategory(cat.id, { name: e.target.value })
                  }
                  aria-label="Category name"
                />
                <div className="grade-weight">
                  <input
                    className="field-input grades-narrow"
                    type="number"
                    min={0}
                    max={100}
                    value={cat.weight}
                    onChange={(e) =>
                      updateCategory(cat.id, {
                        weight: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    aria-label={`${cat.name} weight percent`}
                  />
                  <span className="muted-note">%</span>
                </div>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => removeCategory(cat.id)}
                  aria-label={`Remove ${cat.name}`}
                >
                  ✕
                </button>
              </div>

              <ul className="grade-items">
                {items.map((item) => (
                  <li key={item.id} className="grade-item">
                    <input
                      className="field-input grade-item-name"
                      value={item.name}
                      onChange={(e) =>
                        updateItem(cat.id, item.id, { name: e.target.value })
                      }
                      aria-label="Item name"
                    />
                    <input
                      className="field-input grades-score"
                      type="number"
                      min={0}
                      value={item.score ?? ""}
                      onChange={(e) =>
                        updateItem(cat.id, item.id, {
                          score: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                      placeholder="—"
                      aria-label="Score"
                    />
                    <span className="grade-slash">/</span>
                    <input
                      className="field-input grades-score"
                      type="number"
                      min={1}
                      value={item.outOf}
                      onChange={(e) =>
                        updateItem(cat.id, item.id, {
                          outOf: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      aria-label="Out of"
                    />
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => removeItem(cat.id, item.id)}
                      aria-label="Remove item"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => addItem(cat.id)}
              >
                + Item
              </button>
            </div>
          );
        })}

        <div className="grade-cats-foot">
          <button type="button" className="btn btn-ghost" onClick={addCategory}>
            + Category
          </button>
          <span
            className={totalWeight === 100 ? "muted-note" : "field-error"}
            aria-live="polite"
          >
            Weights total {totalWeight}%
            {totalWeight !== 100 ? " (should be 100%)" : ""}
          </span>
        </div>
      </div>

      {/* Auto-detect from syllabus text */}
      <details className="grade-detect">
        <summary>Auto-detect categories from syllabus text</summary>
        <p className="muted-note">
          Paste the grading section of your syllabus and Semestra will pull out
          the weighted categories.
        </p>
        <textarea
          className="field-input"
          rows={4}
          value={detectText}
          onChange={(e) => setDetectText(e.target.value)}
          placeholder="e.g. Homework 20%, Midterm 30%, Final Exam 50%"
          aria-label="Syllabus grading text"
        />
        <div className="scale-actions">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setDetected(parseGradingScheme(detectText))}
          >
            Detect
          </button>
          {detected && detected.length > 0 && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={applyDetected}
            >
              Add {detected.length} categor{detected.length === 1 ? "y" : "ies"}
            </button>
          )}
        </div>
        {detected &&
          (detected.length > 0 ? (
            <ul className="detect-list">
              {detected.map((d, i) => (
                <li key={`${d.name}-${i}`}>
                  {d.name} — {d.weight}%
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted-note">
              No weighted categories found in that text.
            </p>
          ))}
      </details>

      {/* Syllabus */}
      <div className="syllabus-row">
        <h3 className="grade-subhead">Syllabus</h3>
        {course.syllabus ? (
          <div className="syllabus-file">
            <span className="syllabus-name">{course.syllabus.name}</span>
            <span className="muted-note">{fmtSize(course.syllabus.size)}</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={openSyllabus}>
              Open
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => fileRef.current?.click()}
            >
              Replace
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={removeSyllabus}
            >
              Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => fileRef.current?.click()}
          >
            Upload syllabus
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.md,image/*"
          className="sr-only"
          onChange={handleSyllabus}
          aria-label="Upload syllabus file"
        />
      </div>

      {/* Grading scale */}
      <details className="grade-scale">
        <summary>Grading scale ({scale.length} bands)</summary>
        <p className="muted-note">
          The percentage needed for each letter. Adjust to match your
          syllabus.
        </p>
        <ul className="scale-list">
          {scale.map((band, i) => (
            <li key={`${band.letter}-${i}`} className="scale-band">
              <input
                className="field-input grades-narrow"
                value={band.letter}
                onChange={(e) => {
                  const next = scale.map((b, j) =>
                    j === i ? { ...b, letter: e.target.value } : b,
                  );
                  onPatch({ gradeScale: next });
                }}
                aria-label="Letter"
              />
              <span className="muted-note">≥</span>
              <input
                className="field-input grades-narrow"
                type="number"
                value={band.min}
                onChange={(e) => {
                  const next = scale.map((b, j) =>
                    j === i ? { ...b, min: Number(e.target.value) || 0 } : b,
                  );
                  onPatch({ gradeScale: next });
                }}
                aria-label="Minimum percent"
              />
              <button
                type="button"
                className="btn-icon"
                onClick={() =>
                  onPatch({
                    gradeScale: scale.filter((_, j) => j !== i) as GradeBand[],
                  })
                }
                aria-label={`Remove ${band.letter} band`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <div className="scale-actions">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() =>
              onPatch({
                gradeScale: [...scale, { letter: "?", min: 0 }],
              })
            }
          >
            + Band
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onPatch({ gradeScale: DEFAULT_GRADE_SCALE })}
          >
            Reset to default
          </button>
        </div>
      </details>
    </section>
  );
}
