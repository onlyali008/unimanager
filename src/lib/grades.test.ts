import { describe, it, expect } from "vitest";
import type { Course } from "./types";
import {
  categoryPercent,
  computeCourseGrade,
  computeTermGpa,
  letterForPercent,
  neededOnRemaining,
  parseGradingScheme,
} from "./grades";

function course(partial: Partial<Course>): Course {
  return {
    id: partial.id ?? "c",
    name: partial.name ?? "Course",
    code: partial.code ?? "",
    color: "#000",
    termId: "term-1",
    meetingDays: [],
    archived: partial.archived ?? false,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("categoryPercent", () => {
  it("averages graded items by points, ignoring ungraded", () => {
    expect(
      categoryPercent({
        id: "x",
        name: "HW",
        weight: 20,
        items: [
          { id: "1", name: "hw1", score: 9, outOf: 10 },
          { id: "2", name: "hw2", score: 8, outOf: 10 },
          { id: "3", name: "hw3", score: null, outOf: 10 },
        ],
      }),
    ).toBe(85);
  });

  it("returns null when nothing is graded", () => {
    expect(
      categoryPercent({ id: "x", name: "HW", weight: 20, items: [] }),
    ).toBeNull();
  });
});

describe("letterForPercent (default scale)", () => {
  it("maps to the highest band met", () => {
    expect(letterForPercent(92)).toBe("A+");
    expect(letterForPercent(85)).toBe("A");
    expect(letterForPercent(40)).toBe("F");
  });
});

describe("computeCourseGrade", () => {
  it("weights only graded categories and derives letter + GPA", () => {
    const c = course({
      categories: [
        {
          id: "hw",
          name: "Homework",
          weight: 40,
          items: [{ id: "a", name: "hw1", score: 90, outOf: 100 }],
        },
        {
          id: "mid",
          name: "Midterm",
          weight: 60,
          items: [{ id: "m", name: "mid", score: 80, outOf: 100 }],
        },
      ],
    });
    const g = computeCourseGrade(c);
    // (90*40 + 80*60)/100 = 84 earned; graded weight 100 → earnedPercent 84
    expect(g.earnedPercent).toBeCloseTo(84);
    expect(g.gradedWeight).toBe(100);
    expect(g.letter).toBe("A-");
    expect(g.gpaPoints).toBe(3.7);
  });

  it("ignores ungraded categories in the average", () => {
    const c = course({
      categories: [
        {
          id: "hw",
          name: "HW",
          weight: 50,
          items: [{ id: "a", name: "hw1", score: 100, outOf: 100 }],
        },
        { id: "final", name: "Final", weight: 50, items: [] },
      ],
    });
    const g = computeCourseGrade(c);
    expect(g.earnedPercent).toBe(100);
    expect(g.gradedWeight).toBe(50);
    expect(g.remainingWeight).toBe(50);
    expect(g.earnedPoints).toBe(50);
  });
});

describe("neededOnRemaining", () => {
  it("computes the average needed on the remaining weight", () => {
    const c = course({
      categories: [
        {
          id: "hw",
          name: "HW",
          weight: 50,
          items: [{ id: "a", name: "hw1", score: 80, outOf: 100 }],
        },
        { id: "final", name: "Final", weight: 50, items: [] },
      ],
    });
    // earned points = 40; to reach 90 overall need (90-40)/50*100 = 100 on final
    expect(neededOnRemaining(c, 90)).toBeCloseTo(100);
  });
});

describe("parseGradingScheme", () => {
  it("detects labeled weights in common syllabus formats", () => {
    const text = `Grading:
Homework 20%
Midterm: 30%
40% - Final Exam
Participation .......... 10%`;
    const cats = parseGradingScheme(text);
    const byName = Object.fromEntries(cats.map((c) => [c.name, c.weight]));
    expect(byName["Homework"]).toBe(20);
    expect(byName["Midterm"]).toBe(30);
    expect(byName["Final Exam"]).toBe(40);
    expect(byName["Participation"]).toBe(10);
  });

  it("ignores nonsense percentages", () => {
    const cats = parseGradingScheme("attendance is 150% important, really 0%");
    expect(cats).toHaveLength(0);
  });
});

describe("computeTermGpa", () => {
  it("credit-weights GPA across graded courses", () => {
    const a = course({
      id: "a",
      credits: 3,
      categories: [
        {
          id: "x",
          name: "All",
          weight: 100,
          items: [{ id: "i", name: "t", score: 95, outOf: 100 }],
        },
      ],
    }); // 95 → A+ → 4.0
    const b = course({
      id: "b",
      credits: 1,
      categories: [
        {
          id: "y",
          name: "All",
          weight: 100,
          items: [{ id: "i", name: "t", score: 72, outOf: 100 }],
        },
      ],
    }); // 72 → B- → 2.7
    const { gpa, gradedCredits } = computeTermGpa([a, b]);
    expect(gradedCredits).toBe(4);
    expect(gpa).toBeCloseTo((4.0 * 3 + 2.7 * 1) / 4);
  });
});
