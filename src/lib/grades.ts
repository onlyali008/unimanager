import type { Course, GradeBand, GradeCategory } from "./types";
import { DEFAULT_GRADE_SCALE, GPA_POINTS } from "./types";

export interface DetectedCategory {
  name: string;
  weight: number;
}

function cleanLabel(raw: string): string {
  return raw
    .replace(/[•\-–—*:.\s]+$/g, "")
    .replace(/^[•\-–—*.\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Detect weighted grade categories from pasted syllabus text, e.g.
 * "Homework 20%", "Midterm: 30%", or "40% - Final Exam". Best-effort; returns
 * de-duplicated {name, weight} pairs in the order found.
 */
export function parseGradingScheme(text: string): DetectedCategory[] {
  const found = new Map<string, DetectedCategory>();
  const add = (rawName: string, pct: number) => {
    const name = cleanLabel(rawName);
    if (!name || name.length > 40) return;
    if (pct <= 0 || pct > 100) return;
    if (/^\d+$/.test(name)) return;
    const key = name.toLowerCase();
    if (!found.has(key)) found.set(key, { name, weight: pct });
  };

  // "Label ... 30%"
  const after = /([A-Za-z][A-Za-z &/()'’.-]{1,40}?)\s*[:\-–—]?\s*(\d{1,3})\s*%/g;
  let m: RegExpExecArray | null;
  while ((m = after.exec(text))) add(m[1], parseInt(m[2], 10));

  // "30% ... Label" (percent first)
  const before = /(\d{1,3})\s*%\s*[:\-–—]?\s*([A-Za-z][A-Za-z &/()'’.-]{1,40})/g;
  while ((m = before.exec(text))) add(m[2], parseInt(m[1], 10));

  return [...found.values()];
}

export interface CourseGrade {
  /** Weighted % across categories that have at least one graded item. */
  earnedPercent: number | null;
  /** Sum of weights of categories that are (partly) graded. */
  gradedWeight: number;
  /** Points earned so far out of 100 (weighted). */
  earnedPoints: number;
  /** Remaining weight not yet graded. */
  remainingWeight: number;
  letter: string | null;
  gpaPoints: number | null;
  hasGrades: boolean;
}

/** Average % for one category over its graded items (null if none graded). */
export function categoryPercent(category: GradeCategory): number | null {
  let earned = 0;
  let possible = 0;
  for (const item of category.items) {
    if (item.score !== null && item.outOf > 0) {
      earned += item.score;
      possible += item.outOf;
    }
  }
  if (possible === 0) return null;
  return (earned / possible) * 100;
}

/** Map a percentage to a letter using a course's scale (or the default). */
export function letterForPercent(
  percent: number,
  scale: GradeBand[] = DEFAULT_GRADE_SCALE,
): string {
  const bands = [...scale].sort((a, b) => b.min - a.min);
  for (const band of bands) {
    if (percent >= band.min) return band.letter;
  }
  return bands[bands.length - 1]?.letter ?? "F";
}

export function gpaForLetter(letter: string): number | null {
  const key = letter.trim().toUpperCase();
  return key in GPA_POINTS ? GPA_POINTS[key] : null;
}

export function computeCourseGrade(course: Course): CourseGrade {
  const categories = course.categories ?? [];
  const scale = course.gradeScale ?? DEFAULT_GRADE_SCALE;

  let weightedSum = 0; // sum(categoryPct * weight) over graded categories
  let gradedWeight = 0;
  let totalWeight = 0;

  for (const category of categories) {
    totalWeight += category.weight;
    const pct = categoryPercent(category);
    if (pct !== null) {
      weightedSum += pct * category.weight;
      gradedWeight += category.weight;
    }
  }

  const hasGrades = gradedWeight > 0;
  const earnedPercent = hasGrades ? weightedSum / gradedWeight : null;
  const earnedPoints = weightedSum / 100; // points out of 100 earned so far
  const remainingWeight = Math.max(0, totalWeight - gradedWeight);
  const letter = earnedPercent !== null ? letterForPercent(earnedPercent, scale) : null;
  const gpaPoints = letter !== null ? gpaForLetter(letter) : null;

  return {
    earnedPercent,
    gradedWeight,
    earnedPoints,
    remainingWeight,
    letter,
    gpaPoints,
    hasGrades,
  };
}

/**
 * Average % needed on the remaining (ungraded) weight to reach a target overall
 * percentage. Returns null if nothing remains; may exceed 100 (unreachable).
 */
export function neededOnRemaining(
  course: Course,
  targetPercent: number,
): number | null {
  const grade = computeCourseGrade(course);
  if (grade.remainingWeight <= 0) return null;
  const needed =
    ((targetPercent - grade.earnedPoints) / grade.remainingWeight) * 100;
  return needed;
}

export interface TermGpa {
  gpa: number | null;
  gradedCredits: number;
  gradedCourses: number;
}

/** Credit-weighted term GPA across courses that have any grades. */
export function computeTermGpa(courses: Course[]): TermGpa {
  let points = 0;
  let credits = 0;
  let count = 0;
  for (const course of courses) {
    if (course.archived) continue;
    const grade = computeCourseGrade(course);
    if (grade.gpaPoints === null) continue;
    const c = course.credits && course.credits > 0 ? course.credits : 1;
    points += grade.gpaPoints * c;
    credits += c;
    count += 1;
  }
  return {
    gpa: credits > 0 ? points / credits : null,
    gradedCredits: credits,
    gradedCourses: count,
  };
}
