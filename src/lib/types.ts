// Core domain model for Semestra.

export type TaskType = "assignment" | "exam" | "reading" | "project" | "study";

export type Priority = "low" | "medium" | "high";

export const TASK_TYPES: TaskType[] = [
  "assignment",
  "exam",
  "reading",
  "project",
  "study",
];

export const PRIORITIES: Priority[] = ["low", "medium", "high"];

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  assignment: "Assignment",
  exam: "Exam",
  reading: "Reading",
  project: "Project",
  study: "Study session",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

/** Curated accent palette offered when creating a course. */
export const COURSE_PALETTE = [
  "#b5651d",
  "#3f6f5b",
  "#5b6abe",
  "#9a5b8f",
  "#4f7fa8",
  "#a8794f",
  "#7a8b3c",
  "#b23b5e",
];

export interface Term {
  id: string;
  name: string;
  /** ISO date (yyyy-mm-dd). Optional. */
  startDate?: string;
  endDate?: string;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  instructor?: string;
  color: string;
  termId: string;
  /** Weekly meeting days, 0 = Sunday … 6 = Saturday. */
  meetingDays: number[];
  /** "HH:mm" 24h local time. */
  meetingStart?: string;
  meetingEnd?: string;
  targetGrade?: string;
  /** Free-form course notes (markdown-ish plain text). */
  notes?: string;
  /** Credit hours, used to weight the term GPA. Defaults to 1 when unset. */
  credits?: number;
  /** Weighted assessment categories for grade tracking. */
  categories?: GradeCategory[];
  /** Percentage→letter bands from the syllabus. Falls back to a default. */
  gradeScale?: GradeBand[];
  /** Uploaded syllabus file (bytes live in the file blob store). */
  syllabus?: SyllabusMeta;
  archived: boolean;
  createdAt: string;
}

export interface GradeItem {
  id: string;
  name: string;
  /** Points earned, or null if not graded yet. */
  score: number | null;
  outOf: number;
}

export interface GradeCategory {
  id: string;
  name: string;
  /** Percentage of the final grade this category is worth (e.g. 30). */
  weight: number;
  items: GradeItem[];
}

/** A percentage cutoff for a letter grade, e.g. { letter: "A", min: 85 }. */
export interface GradeBand {
  letter: string;
  min: number;
}

export interface SyllabusMeta {
  fileId: string;
  name: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

/** North American 4.0 GPA points by letter grade. */
export const GPA_POINTS: Record<string, number> = {
  "A+": 4.0,
  A: 4.0,
  "A-": 3.7,
  "B+": 3.3,
  B: 3.0,
  "B-": 2.7,
  "C+": 2.3,
  C: 2.0,
  "C-": 1.7,
  "D+": 1.3,
  D: 1.0,
  "D-": 0.7,
  F: 0.0,
};

/** Default percentage→letter scale (used when a course sets none). */
export const DEFAULT_GRADE_SCALE: GradeBand[] = [
  { letter: "A+", min: 90 },
  { letter: "A", min: 85 },
  { letter: "A-", min: 80 },
  { letter: "B+", min: 77 },
  { letter: "B", min: 73 },
  { letter: "B-", min: 70 },
  { letter: "C+", min: 67 },
  { letter: "C", min: 63 },
  { letter: "C-", min: 60 },
  { letter: "D+", min: 57 },
  { letter: "D", min: 53 },
  { letter: "D-", min: 50 },
  { letter: "F", min: 0 },
];

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  termId: string;
  courseId?: string;
  /** ISO 8601 datetime. For study sessions, this is the scheduled time. */
  dueAt?: string;
  priority: Priority;
  estimatedMinutes?: number;
  /** Actual focused minutes logged via the study timer. */
  loggedMinutes?: number;
  notes?: string;
  completed: boolean;
  completedAt?: string;
  /** For study sessions created from another task. */
  linkedTaskId?: string;
  createdAt: string;
}

/** A named, self-contained piece of course material (artifact-style). */
export type ArtifactKind = "note" | "transcript" | "audio";

export const ARTIFACT_KIND_LABELS: Record<ArtifactKind, string> = {
  note: "Note",
  transcript: "Transcript",
  audio: "Recording",
};

export interface Artifact {
  id: string;
  courseId: string;
  termId: string;
  kind: ArtifactKind;
  title: string;
  /** Markdown/plain text for note & transcript; empty for audio. */
  content: string;
  /** Key into the IndexedDB audio blob store (audio artifacts only). */
  audioId?: string;
  durationMs?: number;
  mimeType?: string;
  createdAt: string;
  updatedAt: string;
}

export type ThemePref = "system" | "light" | "dark";
export type Density = "comfortable" | "compact";

export interface Settings {
  theme: ThemePref;
  density: Density;
  currentTermId: string;
  /** Base URL of a local Ollama server for the assistant. */
  ollamaUrl: string;
  /** Ollama model tag used by the assistant. */
  ollamaModel: string;
}

export const DEFAULT_OLLAMA_URL = "http://localhost:11434";
export const DEFAULT_OLLAMA_MODEL = "llama3.2:1b";

/** Minutes of focused study logged on a given local calendar day. */
export interface FocusEntry {
  /** Local date, "YYYY-MM-DD". */
  date: string;
  minutes: number;
}

export interface StoreState {
  version: number;
  terms: Term[];
  courses: Course[];
  tasks: Task[];
  artifacts: Artifact[];
  focusLog: FocusEntry[];
  settings: Settings;
}

export const CURRENT_SCHEMA_VERSION = 3;

export const DEFAULT_SETTINGS: Omit<Settings, "currentTermId"> = {
  theme: "system",
  density: "comfortable",
  ollamaUrl: DEFAULT_OLLAMA_URL,
  ollamaModel: DEFAULT_OLLAMA_MODEL,
};
