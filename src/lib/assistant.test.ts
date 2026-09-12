import { describe, it, expect } from "vitest";
import type { Course, Task, Term } from "./types";
import { buildScheduleContext, localAnswer } from "./assistant";

const NOW = new Date("2026-09-03T12:00:00");

const term: Term = { id: "term-1", name: "Fall 2026" };

const courses: Course[] = [
  {
    id: "c1",
    name: "Algorithms",
    code: "CS 240",
    color: "#000",
    termId: "term-1",
    meetingDays: [1, 3],
    meetingStart: "10:00",
    meetingEnd: "11:15",
    archived: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "c2",
    name: "Old Course",
    code: "OLD 100",
    color: "#111",
    termId: "term-1",
    meetingDays: [],
    archived: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

function task(p: Partial<Task>): Task {
  return {
    id: p.id ?? "t",
    title: p.title ?? "Task",
    type: p.type ?? "assignment",
    termId: "term-1",
    priority: p.priority ?? "medium",
    completed: p.completed ?? false,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...p,
  };
}

describe("buildScheduleContext", () => {
  it("includes active courses and flags overdue tasks, excluding archived and completed", () => {
    const tasks = [
      task({ id: "1", title: "PSet 4", courseId: "c1", dueAt: "2026-09-01T09:00:00" }),
      task({ id: "2", title: "Reading", courseId: "c1", dueAt: "2026-09-10T09:00:00" }),
      task({ id: "3", title: "Done thing", completed: true }),
    ];
    const ctx = buildScheduleContext(tasks, courses, term, NOW);

    expect(ctx).toContain("Fall 2026");
    expect(ctx).toContain("CS 240");
    expect(ctx).not.toContain("OLD 100"); // archived course excluded
    expect(ctx).toContain("PSet 4");
    expect(ctx).toContain("[OVERDUE]");
    expect(ctx).not.toContain("Done thing"); // completed excluded
  });

  it("reports when there are no open tasks", () => {
    const ctx = buildScheduleContext([], courses, term, NOW);
    expect(ctx).toContain("No open tasks.");
  });
});

describe("localAnswer", () => {
  const tasks = [
    task({ id: "1", title: "PSet 4", courseId: "c1", dueAt: "2026-09-01T09:00:00" }),
    task({ id: "2", title: "Lab", courseId: "c1", dueAt: "2026-09-03T20:00:00" }),
    task({ id: "3", title: "Final", type: "exam", dueAt: "2026-09-20T09:00:00" }),
  ];

  it("answers 'due today' from the data", () => {
    const a = localAnswer("what's due today?", tasks, courses, NOW);
    expect(a).toContain("Due today");
    expect(a).toContain("Lab");
    expect(a).not.toContain("PSet 4");
  });

  it("answers about overdue work", () => {
    const a = localAnswer("anything overdue?", tasks, courses, NOW);
    expect(a).toContain("PSet 4");
  });

  it("answers about exams", () => {
    const a = localAnswer("when is my next exam?", tasks, courses, NOW);
    expect(a).toContain("Final");
  });

  it("returns null for an unrecognized question", () => {
    expect(localAnswer("what is the meaning of life?", tasks, courses, NOW)).toBeNull();
  });
});
