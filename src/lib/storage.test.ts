import { describe, it, expect } from "vitest";
import { importJSON, migrateState } from "./storage";
import { CURRENT_SCHEMA_VERSION } from "./types";

describe("migrateState v1 -> v2", () => {
  it("lifts legacy free-text course labels into Course records", () => {
    const v1 = {
      version: 1,
      tasks: [
        {
          id: "t1",
          title: "Problem set",
          type: "assignment",
          priority: "high",
          completed: false,
          course: "CS 240",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "t2",
          title: "Reading",
          type: "reading",
          priority: "low",
          completed: false,
          course: "CS 240",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    };

    const state = migrateState(v1);
    expect(state.version).toBe(CURRENT_SCHEMA_VERSION);
    // One course created for the shared "CS 240" label.
    expect(state.courses).toHaveLength(1);
    const courseId = state.courses[0].id;
    expect(state.courses[0].name).toBe("CS 240");
    // Both tasks linked to it.
    expect(state.tasks.every((t) => t.courseId === courseId)).toBe(true);
    // A default term exists and tasks belong to it.
    expect(state.terms.length).toBeGreaterThanOrEqual(1);
    expect(state.tasks.every((t) => t.termId === state.terms[0].id)).toBe(true);
  });

  it("drops invalid task records but keeps valid ones", () => {
    const state = migrateState({
      version: 1,
      tasks: [
        { id: "ok", title: "Valid", type: "assignment", priority: "medium" },
        { id: "", title: "No id" },
        { title: "No id field" },
        null,
        42,
      ],
    });
    expect(state.tasks).toHaveLength(1);
    expect(state.tasks[0].id).toBe("ok");
  });

  it("coerces unknown enum values to safe defaults", () => {
    const state = migrateState({
      version: 2,
      tasks: [
        {
          id: "t",
          title: "Weird",
          type: "nonsense",
          priority: "urgent",
          completed: "yes",
        },
      ],
    });
    expect(state.tasks[0].type).toBe("assignment");
    expect(state.tasks[0].priority).toBe("medium");
    // Non-boolean completed is not treated as true.
    expect(state.tasks[0].completed).toBe(false);
  });

  it("ensures currentTermId points at a real term", () => {
    const state = migrateState({
      version: 2,
      terms: [{ id: "term-x", name: "Fall" }],
      settings: { currentTermId: "does-not-exist" },
      tasks: [],
    });
    expect(state.settings.currentTermId).toBe("term-x");
  });
});

describe("importJSON", () => {
  it("parses and validates a well-formed document", () => {
    const doc = JSON.stringify({
      version: 2,
      terms: [{ id: "term-1", name: "Fall 2026" }],
      courses: [],
      tasks: [
        {
          id: "t",
          title: "Imported",
          type: "exam",
          priority: "high",
          completed: false,
          termId: "term-1",
        },
      ],
      settings: { theme: "dark", density: "compact", currentTermId: "term-1" },
    });
    const state = importJSON(doc);
    expect(state.tasks[0].title).toBe("Imported");
    expect(state.settings.theme).toBe("dark");
    expect(state.settings.density).toBe("compact");
  });

  it("throws on invalid JSON so callers can recover", () => {
    expect(() => importJSON("{not json")).toThrow();
  });
});
