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
  archived: boolean;
  createdAt: string;
}

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

export interface StoreState {
  version: number;
  terms: Term[];
  courses: Course[];
  tasks: Task[];
  artifacts: Artifact[];
  settings: Settings;
}

export const CURRENT_SCHEMA_VERSION = 3;

export const DEFAULT_SETTINGS: Omit<Settings, "currentTermId"> = {
  theme: "system",
  density: "comfortable",
  ollamaUrl: DEFAULT_OLLAMA_URL,
  ollamaModel: DEFAULT_OLLAMA_MODEL,
};
