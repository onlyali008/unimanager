import { promises as fs } from "node:fs";
import path from "node:path";

import { getCourses } from "@/lib/vault/entries";

/**
 * Daily-pull configuration. App-managed (edited from the Library page),
 * stored outside the vault so it isn't itself indexed.
 */
export interface KnowledgeSources {
  /** Enabled Wikipedia subjects to gather related articles for. */
  subjects: string[];
  /** Individual article page URLs to extract. */
  urls: string[];
  /** RSS/Atom feed URLs; recent entries are extracted. */
  feeds: string[];
  /** How many related articles to keep per subject each pull. */
  articlesPerSubject: number;
}

const SOURCES_PATH = path.join(process.cwd(), ".semestra", "knowledge-sources.json");

const DEFAULTS: KnowledgeSources = {
  subjects: [],
  urls: [],
  feeds: [],
  articlesPerSubject: 4,
};

function normalizeList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .filter((v): v is string => typeof v === "string")
        .map((v) => v.trim())
        .filter(Boolean),
    ),
  ];
}

export async function loadSources(): Promise<KnowledgeSources> {
  try {
    const raw = JSON.parse(await fs.readFile(SOURCES_PATH, "utf8"));
    return {
      subjects: normalizeList(raw.subjects),
      urls: normalizeList(raw.urls),
      feeds: normalizeList(raw.feeds),
      articlesPerSubject:
        Number.isFinite(raw.articlesPerSubject) && raw.articlesPerSubject > 0
          ? Math.min(10, Math.floor(raw.articlesPerSubject))
          : DEFAULTS.articlesPerSubject,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function saveSources(
  sources: KnowledgeSources,
): Promise<KnowledgeSources> {
  const clean: KnowledgeSources = {
    subjects: normalizeList(sources.subjects),
    urls: normalizeList(sources.urls),
    feeds: normalizeList(sources.feeds),
    articlesPerSubject:
      Number.isFinite(sources.articlesPerSubject) && sources.articlesPerSubject > 0
        ? Math.min(10, Math.floor(sources.articlesPerSubject))
        : DEFAULTS.articlesPerSubject,
  };
  await fs.mkdir(path.dirname(SOURCES_PATH), { recursive: true });
  await fs.writeFile(SOURCES_PATH, JSON.stringify(clean, null, 2), "utf8");
  return clean;
}

/** Course names, offered as one-click subject suggestions in the UI. */
export async function suggestedSubjects(): Promise<string[]> {
  const courses = await getCourses();
  return [
    ...new Set(
      courses
        .map((c) => c.course_name?.trim())
        .filter((name): name is string => Boolean(name)),
    ),
  ];
}
