import { promises as fs } from "node:fs";

import { readNote, resolveInVault } from "@/lib/vault/fs";
import type { BaseFrontmatter, NoteType } from "@/lib/vault/types";

/** Folders whose notes are worth indexing for retrieval. */
const INDEXED_FOLDERS = [
  "nutrition",
  "fitness",
  "sleep",
  "wellness",
  "academics",
  "finances",
  "daily-notes",
  "insights",
  "schedule",
] as const;

/** Note types eligible for auto-tagging (never MOCs or app-managed docs). */
export const TAGGABLE_TYPES: NoteType[] = [
  "nutrition",
  "fitness",
  "sleep",
  "wellness",
  "academics",
  "finances",
  "daily",
];

export interface CollectedNote {
  /** e.g. "sleep/2026-07-06.md" */
  relPath: string;
  type: NoteType;
  /** date / month / week — whichever the note carries; null for course notes. */
  date: string | null;
  tags: string[];
  /** Frontmatter serialized as retrievable text + note body. */
  text: string;
  body: string;
  frontmatter: BaseFrontmatter & Record<string, unknown>;
}

function serializeFrontmatter(fm: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(fm)) {
    if (value === null || value === undefined || key === "created") continue;
    if (Array.isArray(value) || typeof value === "object") {
      lines.push(`${key}: ${JSON.stringify(value)}`);
    } else {
      lines.push(`${key}: ${String(value)}`);
    }
  }
  return lines.join("\n");
}

async function walkMarkdown(relDir: string): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(resolveInVault(relDir), {
      withFileTypes: true,
    });
  } catch {
    return [];
  }
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      files.push(...(await walkMarkdown(`${relDir}/${entry.name}`)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(`${relDir}/${entry.name}`);
    }
  }
  return files;
}

/**
 * Collects every indexable vault note as one retrieval chunk: frontmatter
 * fields serialized as text (so structured data is searchable, not just
 * prose) plus the note body.
 */
export async function collectNotes(): Promise<CollectedNote[]> {
  const notes: CollectedNote[] = [];
  for (const folder of INDEXED_FOLDERS) {
    for (const relPath of await walkMarkdown(folder)) {
      const note = await readNote<BaseFrontmatter & Record<string, unknown>>(
        relPath,
      );
      if (!note || typeof note.frontmatter.type !== "string") continue;
      const fm = note.frontmatter;
      const date =
        (fm.date as string | undefined) ??
        (fm.month as string | undefined) ??
        (fm.week as string | undefined) ??
        null;
      const text = [
        `note: ${relPath}`,
        serializeFrontmatter(fm),
        note.body.trim(),
      ]
        .filter(Boolean)
        .join("\n");
      notes.push({
        relPath,
        type: fm.type as NoteType,
        date,
        tags: Array.isArray(fm.tags) ? (fm.tags as string[]) : [],
        text,
        body: note.body,
        frontmatter: fm,
      });
    }
  }
  return notes;
}
