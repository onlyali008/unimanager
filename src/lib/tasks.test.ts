import { describe, it, expect } from "vitest";
import type { Course, Task } from "./types";
import {
  dueBucket,
  filterTasks,
  itemsForDay,
  recommendTasks,
  sortTasks,
  summarize,
  totalEstimateMinutes,
  upcomingExams,
} from "./tasks";

function task(partial: Partial<Task>): Task {
  return {
    id: partial.id ?? "t1",
    title: partial.title ?? "Task",
    type: partial.type ?? "assignment",
    termId: partial.termId ?? "term-1",
    priority: partial.priority ?? "medium",
    completed: partial.completed ?? false,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

const NOW = new Date("2026-09-03T12:00:00");

describe("dueBucket", () => {
  it("classifies a past day as overdue", () => {
    expect(dueBucket(task({ dueAt: "2026-09-01T09:00:00" }), NOW)).toBe(
      "overdue",
    );
  });

  it("treats a later time today as due today", () => {
    expect(dueBucket(task({ dueAt: "2026-09-03T20:00:00" }), NOW)).toBe("today");
  });

  it("treats an earlier time today as overdue", () => {
    expect(dueBucket(task({ dueAt: "2026-09-03T08:00:00" }), NOW)).toBe(
      "overdue",
    );
  });

  it("classifies a future day as upcoming", () => {
    expect(dueBucket(task({ dueAt: "2026-09-10T09:00:00" }), NOW)).toBe(
      "upcoming",
    );
  });

  it("classifies no due date as someday", () => {
    expect(dueBucket(task({ dueAt: undefined }), NOW)).toBe("someday");
  });
});

describe("sortTasks", () => {
  it("orders by due date, undated last, then priority", () => {
    const a = task({ id: "a", dueAt: "2026-09-05T09:00:00", priority: "low" });
    const b = task({ id: "b", dueAt: "2026-09-04T09:00:00", priority: "low" });
    const c = task({ id: "c", dueAt: undefined, priority: "high" });
    const d = task({ id: "d", dueAt: "2026-09-04T09:00:00", priority: "high" });
    const sorted = sortTasks([a, b, c, d]).map((t) => t.id);
    expect(sorted).toEqual(["d", "b", "a", "c"]);
  });
});

describe("filterTasks", () => {
  const courses: Course[] = [
    {
      id: "c1",
      name: "Algorithms",
      code: "CS 240",
      color: "#000",
      termId: "term-1",
      meetingDays: [],
      archived: false,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ];
  const tasks = [
    task({ id: "1", title: "Essay", courseId: "c1", completed: false }),
    task({ id: "2", title: "Reading", completed: true }),
    task({ id: "3", title: "Lab", type: "exam" }),
  ];

  it("filters by active status", () => {
    const out = filterTasks(tasks, {
      search: "",
      courseId: "all",
      type: "all",
      status: "active",
    });
    expect(out.map((t) => t.id)).toEqual(["1", "3"]);
  });

  it("filters by course id", () => {
    const out = filterTasks(tasks, {
      search: "",
      courseId: "c1",
      type: "all",
      status: "all",
    });
    expect(out.map((t) => t.id)).toEqual(["1"]);
  });

  it("searches title and course label", () => {
    const out = filterTasks(
      tasks,
      { search: "cs 240", courseId: "all", type: "all", status: "all" },
      courses,
    );
    expect(out.map((t) => t.id)).toEqual(["1"]);
  });
});

describe("summarize", () => {
  it("counts buckets and completed", () => {
    const tasks = [
      task({ id: "1", dueAt: "2026-09-01T09:00:00" }), // overdue
      task({ id: "2", dueAt: "2026-09-03T20:00:00" }), // today
      task({ id: "3", dueAt: "2026-09-20T09:00:00" }), // upcoming
      task({ id: "4", completed: true }),
    ];
    expect(summarize(tasks, NOW)).toEqual({
      overdue: 1,
      today: 1,
      upcoming: 1,
      completed: 1,
    });
  });
});

describe("recommendTasks", () => {
  it("ranks overdue and due-today work above distant, low-priority tasks", () => {
    const tasks = [
      task({ id: "far", title: "Far", dueAt: "2026-10-01T09:00:00", priority: "low" }),
      task({ id: "over", title: "Overdue", dueAt: "2026-09-01T09:00:00" }),
      task({ id: "today", title: "Today", dueAt: "2026-09-03T20:00:00" }),
      task({ id: "done", title: "Done", completed: true, dueAt: "2026-09-01T09:00:00" }),
    ];
    const rec = recommendTasks(tasks, NOW, 2).map((t) => t.id);
    expect(rec).toEqual(["over", "today"]);
    expect(rec).not.toContain("done");
  });
});

describe("upcomingExams", () => {
  it("returns only non-overdue exams with a due date, soonest first", () => {
    const tasks = [
      task({ id: "e1", type: "exam", dueAt: "2026-09-20T09:00:00" }),
      task({ id: "e2", type: "exam", dueAt: "2026-09-10T09:00:00" }),
      task({ id: "past", type: "exam", dueAt: "2026-09-01T09:00:00" }),
      task({ id: "hw", type: "assignment", dueAt: "2026-09-05T09:00:00" }),
    ];
    expect(upcomingExams(tasks, NOW).map((t) => t.id)).toEqual(["e2", "e1"]);
  });
});

describe("totalEstimateMinutes", () => {
  it("sums estimates of incomplete tasks only", () => {
    const tasks = [
      task({ id: "1", estimatedMinutes: 60 }),
      task({ id: "2", estimatedMinutes: 30, completed: true }),
      task({ id: "3", estimatedMinutes: 45 }),
    ];
    expect(totalEstimateMinutes(tasks)).toBe(105);
  });
});

describe("itemsForDay", () => {
  const day = new Date("2026-09-03T00:00:00");
  const courses: Course[] = [
    {
      id: "c1",
      name: "Algorithms",
      code: "CS 240",
      color: "#111",
      termId: "term-1",
      meetingDays: [day.getDay()], // meets on this weekday
      meetingStart: "10:00",
      meetingEnd: "11:00",
      archived: false,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ];

  it("includes a recurring meeting and a due task, ordered by time", () => {
    const tasks = [
      task({ id: "t", title: "PSet", dueAt: "2026-09-03T15:00:00", courseId: "c1" }),
    ];
    const items = itemsForDay(day, tasks, courses);
    expect(items.map((i) => i.kind)).toEqual(["meeting", "task"]);
    expect(items[1].title).toBe("PSet");
  });

  it("excludes meetings for archived courses", () => {
    const archived = courses.map((c) => ({ ...c, archived: true }));
    const items = itemsForDay(day, [], archived);
    expect(items).toHaveLength(0);
  });
});
