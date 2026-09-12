import { describe, it, expect } from "vitest";
import type { Course } from "./types";
import { parseQuickAdd } from "./quickparse";

const NOW = new Date("2026-09-07T09:00:00"); // a Monday

const courses: Course[] = [
  {
    id: "cs",
    name: "Algorithms",
    code: "CS 240",
    color: "#000",
    termId: "term-1",
    meetingDays: [],
    archived: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("parseQuickAdd", () => {
  it("parses due weekday + time and strips them from the title", () => {
    const r = parseQuickAdd("essay due fri 5pm", courses, NOW);
    expect(r.title).toBe("essay");
    const due = new Date(r.dueAt as string);
    expect(due.getDay()).toBe(5); // Friday
    expect(due.getHours()).toBe(17);
  });

  it("matches a course by #code and sets estimate + priority", () => {
    const r = parseQuickAdd("pset 4 #CS240 !high ~2h", courses, NOW);
    expect(r.courseId).toBe("cs");
    expect(r.priority).toBe("high");
    expect(r.estimatedMinutes).toBe(120);
    expect(r.title).toBe("pset 4");
  });

  it("matches a bare course code and infers exam type", () => {
    const r = parseQuickAdd("CS 240 midterm tomorrow", courses, NOW);
    expect(r.courseId).toBe("cs");
    expect(r.type).toBe("exam");
    const due = new Date(r.dueAt as string);
    expect(due.getDate()).toBe(8); // Sept 8 (tomorrow)
  });

  it("handles month + day dates", () => {
    const r = parseQuickAdd("read chapter 7 by Sep 20 noon", courses, NOW);
    const due = new Date(r.dueAt as string);
    expect(due.getMonth()).toBe(8); // September
    expect(due.getDate()).toBe(20);
    expect(due.getHours()).toBe(12);
    expect(r.type).toBe("reading");
  });

  it("falls back to the whole string as the title", () => {
    const r = parseQuickAdd("brainstorm ideas", courses, NOW);
    expect(r.title).toBe("brainstorm ideas");
    expect(r.dueAt).toBeUndefined();
  });
});
