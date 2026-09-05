import type { Course, StoreState, Task, Term } from "./types";
import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_OLLAMA_MODEL,
  DEFAULT_OLLAMA_URL,
} from "./types";

function dayOffset(days: number, hour = 17, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/** Guess a reasonable term name from the current month. */
function currentTermName(now = new Date()): string {
  const year = now.getFullYear();
  const m = now.getMonth();
  if (m >= 0 && m <= 4) return `Spring ${year}`;
  if (m >= 5 && m <= 7) return `Summer ${year}`;
  return `Fall ${year}`;
}

export function createSeedState(): StoreState {
  const now = new Date().toISOString();
  const term: Term = {
    id: "term-1",
    name: currentTermName(),
  };

  const courses: Course[] = [
    {
      id: "course-cs",
      name: "Algorithms",
      code: "CS 240",
      instructor: "Dr. Nadia Rahman",
      color: "#b5651d",
      termId: term.id,
      meetingDays: [1, 3],
      meetingStart: "10:00",
      meetingEnd: "11:15",
      targetGrade: "A",
      archived: false,
      createdAt: now,
    },
    {
      id: "course-hist",
      name: "Modern History",
      code: "HIST 118",
      instructor: "Prof. Alan Wu",
      color: "#3f6f5b",
      termId: term.id,
      meetingDays: [2, 4],
      meetingStart: "13:00",
      meetingEnd: "14:15",
      archived: false,
      createdAt: now,
    },
    {
      id: "course-chem",
      name: "General Chemistry",
      code: "CHEM 101",
      instructor: "Dr. Priya Anand",
      color: "#5b6abe",
      termId: term.id,
      meetingDays: [1, 3, 5],
      meetingStart: "09:00",
      meetingEnd: "09:50",
      targetGrade: "B+",
      archived: false,
      createdAt: now,
    },
    {
      id: "course-des",
      name: "Design Studio",
      code: "DES 210",
      color: "#9a5b8f",
      termId: term.id,
      meetingDays: [4],
      meetingStart: "15:00",
      meetingEnd: "17:00",
      archived: false,
      createdAt: now,
    },
  ];

  let seq = 0;
  const id = () => {
    seq += 1;
    return `seed-${seq}`;
  };

  const mk = (
    t: Omit<Task, "id" | "createdAt" | "termId">,
  ): Task => ({
    ...t,
    id: id(),
    termId: term.id,
    createdAt: now,
  });

  const tasks: Task[] = [
    mk({
      title: "Problem set 4",
      type: "assignment",
      courseId: "course-cs",
      dueAt: dayOffset(-1, 23, 59),
      priority: "high",
      estimatedMinutes: 120,
      notes: "Dynamic programming problems 1–6.",
      completed: false,
    }),
    mk({
      title: "Read Chapter 7",
      type: "reading",
      courseId: "course-hist",
      dueAt: dayOffset(0, 9, 0),
      priority: "medium",
      estimatedMinutes: 45,
      completed: false,
    }),
    mk({
      title: "Lab report submission",
      type: "assignment",
      courseId: "course-chem",
      dueAt: dayOffset(0, 20, 0),
      priority: "high",
      estimatedMinutes: 90,
      completed: false,
    }),
    mk({
      title: "Midterm exam",
      type: "exam",
      courseId: "course-cs",
      dueAt: dayOffset(6, 10, 0),
      priority: "high",
      estimatedMinutes: 0,
      notes: "Covers weeks 1–6. Bring calculator.",
      completed: false,
    }),
    mk({
      title: "Group project checkpoint",
      type: "project",
      courseId: "course-des",
      dueAt: dayOffset(3, 14, 0),
      priority: "medium",
      estimatedMinutes: 180,
      completed: false,
    }),
    mk({
      title: "Study: DP review",
      type: "study",
      courseId: "course-cs",
      dueAt: dayOffset(2, 16, 0),
      priority: "low",
      estimatedMinutes: 60,
      completed: false,
    }),
    mk({
      title: "Essay outline",
      type: "assignment",
      courseId: "course-hist",
      dueAt: dayOffset(-3, 12, 0),
      priority: "medium",
      estimatedMinutes: 45,
      completed: true,
      completedAt: dayOffset(-3, 11, 0),
    }),
    mk({
      title: "Weekly reading response",
      type: "reading",
      courseId: "course-des",
      priority: "low",
      completed: false,
    }),
  ];

  return {
    version: CURRENT_SCHEMA_VERSION,
    terms: [term],
    courses,
    tasks,
    artifacts: [],
    focusLog: [],
    settings: {
      theme: "system",
      density: "comfortable",
      currentTermId: term.id,
      ollamaUrl: DEFAULT_OLLAMA_URL,
      ollamaModel: DEFAULT_OLLAMA_MODEL,
    },
  };
}
