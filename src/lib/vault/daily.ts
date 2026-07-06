import { noteExists, readNote, writeNote } from "./fs";
import type { DailyNoteFrontmatter } from "./types";

const ENTRIES_HEADING = "## Entries";
const REFLECTION_HEADING = "## Reflection";

function emptyDailyBody(dateISO: string): string {
  return `# ${dateISO}\n\n${ENTRIES_HEADING}\n\n${REFLECTION_HEADING}\n\n`;
}

export async function ensureDailyNote(dateISO: string): Promise<string> {
  const relPath = `daily-notes/${dateISO}.md`;
  if (!(await noteExists(relPath))) {
    const frontmatter: DailyNoteFrontmatter = {
      type: "daily",
      date: dateISO,
      tags: [],
      created: new Date().toISOString(),
    };
    await writeNote(relPath, { ...frontmatter }, emptyDailyBody(dateISO));
  }
  return relPath;
}

// Serialize daily-note updates: concurrent entry writes for the same day
// would otherwise race on read-modify-write and drop a wikilink.
let dailyNoteQueue: Promise<unknown> = Promise.resolve();

/**
 * Links a same-day entry from the daily note using a folder-qualified
 * wikilink (filenames repeat across domain folders). Idempotent.
 *
 * @param target vault-relative path without ".md", e.g. "nutrition/2026-07-06"
 */
export function linkEntryInDailyNote(
  dateISO: string,
  target: string,
  label: string,
): Promise<void> {
  const task = dailyNoteQueue.then(() =>
    linkEntrySerialized(dateISO, target, label),
  );
  dailyNoteQueue = task.catch(() => {});
  return task;
}

async function linkEntrySerialized(
  dateISO: string,
  target: string,
  label: string,
): Promise<void> {
  const relPath = await ensureDailyNote(dateISO);
  const note = await readNote<DailyNoteFrontmatter>(relPath);
  if (!note) return;

  if (note.body.includes(`[[${target}`)) return;

  const line = `- [[${target}|${label}]]`;
  let body = note.body;
  const headingIndex = body.indexOf(ENTRIES_HEADING);
  if (headingIndex === -1) {
    body = `${body.trimEnd()}\n\n${ENTRIES_HEADING}\n${line}\n`;
  } else {
    const insertAt = headingIndex + ENTRIES_HEADING.length;
    body = `${body.slice(0, insertAt)}\n${line}${body.slice(insertAt)}`;
  }
  await writeNote(relPath, { ...note.frontmatter }, body);
}
