import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { writeNote } from "@/lib/vault/fs";
import type { NoteType } from "@/lib/vault/types";

import { collectNotes, TAGGABLE_TYPES, type CollectedNote } from "./notes";
import { ollamaChat, ollamaEmbed, ollamaEmbedModel } from "./ollama";

export interface IndexEntry {
  relPath: string;
  type: NoteType;
  date: string | null;
  tags: string[];
  hash: string;
  text: string;
  embedding: number[];
}

export interface VaultIndex {
  embedModel: string;
  updatedAt: string;
  entries: IndexEntry[];
}

export interface IndexSummary {
  totalNotes: number;
  embedded: number;
  removed: number;
  tagged: number;
  errors: string[];
}

const INDEX_DIR = path.join(process.cwd(), ".semestra");
const INDEX_PATH = path.join(INDEX_DIR, "index.json");

function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export async function loadIndex(): Promise<VaultIndex | null> {
  try {
    const raw = await fs.readFile(INDEX_PATH, "utf8");
    return JSON.parse(raw) as VaultIndex;
  } catch {
    return null;
  }
}

async function saveIndex(index: VaultIndex): Promise<void> {
  await fs.mkdir(INDEX_DIR, { recursive: true });
  await fs.writeFile(INDEX_PATH, JSON.stringify(index), "utf8");
}

const TAG_SYSTEM = `You tag personal life-log notes. Reply with 1-2 short kebab-case tags capturing the note's notable theme (e.g. exam-week, low-energy, high-protein, overspending, long-run). Reply with ONLY the tags separated by commas — no explanations. If nothing is notable, reply "none".`;

function parseTags(raw: string): string[] {
  if (/^\s*none\s*$/i.test(raw)) return [];
  return raw
    .split(/[,\n]/)
    .map((t) =>
      t
        .trim()
        .toLowerCase()
        .replace(/^#/, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    )
    .filter((t) => t.length >= 3 && t.length <= 30)
    .slice(0, 2);
}

async function maybeTag(note: CollectedNote): Promise<boolean> {
  if (!TAGGABLE_TYPES.includes(note.type)) return false;
  const suggested = parseTags(
    await ollamaChat(TAG_SYSTEM, note.text.slice(0, 4000), 60_000),
  );
  const merged = [...new Set([...note.tags, ...suggested])].slice(0, 8);
  if (merged.length === note.tags.length) return false;

  await writeNote(note.relPath, { ...note.frontmatter, tags: merged }, note.body);
  note.tags = merged;
  // Keep the indexed text in sync with what we just wrote.
  note.text = note.text.replace(
    /^tags: .*$/m,
    `tags: ${JSON.stringify(merged)}`,
  );
  return true;
}

/**
 * The nightly job: tags new/changed notes via Ollama and keeps the
 * embeddings index incremental — only changed notes are re-embedded,
 * deleted notes are dropped. Safe to run repeatedly.
 */
export async function indexVault(options?: {
  tag?: boolean;
}): Promise<IndexSummary> {
  const shouldTag = options?.tag ?? true;
  const summary: IndexSummary = {
    totalNotes: 0,
    embedded: 0,
    removed: 0,
    tagged: 0,
    errors: [],
  };

  const notes = await collectNotes();
  summary.totalNotes = notes.length;

  const previous = await loadIndex();
  const embedModel = ollamaEmbedModel();
  const previousByPath = new Map<string, IndexEntry>(
    previous && previous.embedModel === embedModel
      ? previous.entries.map((e) => [e.relPath, e])
      : [],
  );

  const entries: IndexEntry[] = [];
  const toEmbed: CollectedNote[] = [];

  for (const note of notes) {
    const existing = previousByPath.get(note.relPath);
    if (existing && existing.hash === hashText(note.text)) {
      entries.push(existing);
      continue;
    }
    if (shouldTag) {
      try {
        if (await maybeTag(note)) summary.tagged += 1;
      } catch (error) {
        summary.errors.push(
          `tag ${note.relPath}: ${error instanceof Error ? error.message : "failed"}`,
        );
      }
    }
    toEmbed.push(note);
  }

  const BATCH = 16;
  for (let i = 0; i < toEmbed.length; i += BATCH) {
    const batch = toEmbed.slice(i, i + BATCH);
    try {
      const vectors = await ollamaEmbed(batch.map((n) => n.text.slice(0, 8000)));
      batch.forEach((note, j) => {
        entries.push({
          relPath: note.relPath,
          type: note.type,
          date: note.date,
          tags: note.tags,
          hash: hashText(note.text),
          text: note.text,
          embedding: vectors[j],
        });
        summary.embedded += 1;
      });
    } catch (error) {
      summary.errors.push(
        `embed batch: ${error instanceof Error ? error.message : "failed"}`,
      );
    }
  }

  const livePaths = new Set(notes.map((n) => n.relPath));
  summary.removed = previous
    ? previous.entries.filter((e) => !livePaths.has(e.relPath)).length
    : 0;

  await saveIndex({
    embedModel,
    updatedAt: new Date().toISOString(),
    entries,
  });

  return summary;
}
