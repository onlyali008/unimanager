import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { readNote, resolveInVault } from "@/lib/vault/fs";
import type { KnowledgeFrontmatter } from "@/lib/vault/types";

import { ollamaEmbed, ollamaEmbedModel } from "../ollama";
import { chunkText } from "./chunk";

/** One embedded chunk of a knowledge note. */
export interface KnowledgeEntry {
  relPath: string;
  chunk: number;
  title: string;
  source: KnowledgeFrontmatter["source"];
  url: string | null;
  subject: string | null;
  /** Whole-note hash — every chunk of a note shares it (incremental reuse). */
  hash: string;
  text: string;
  embedding: number[];
}

export interface KnowledgeIndex {
  embedModel: string;
  updatedAt: string;
  entries: KnowledgeEntry[];
}

export interface KnowledgeMeta {
  updatedAt: string;
  docs: number;
  chunks: number;
}

export interface KnowledgeIndexSummary {
  docs: number;
  embedded: number;
  reused: number;
  removed: number;
  errors: string[];
}

const DIR = path.join(process.cwd(), ".semestra");
const INDEX_PATH = path.join(DIR, "knowledge.json");
const META_PATH = path.join(DIR, "knowledge-meta.json");

const KNOWLEDGE_FOLDERS = ["knowledge/books", "knowledge/wikis", "knowledge/reference"];

function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export async function loadKnowledgeIndex(): Promise<KnowledgeIndex | null> {
  try {
    return JSON.parse(await fs.readFile(INDEX_PATH, "utf8")) as KnowledgeIndex;
  } catch {
    return null;
  }
}

export async function loadKnowledgeMeta(): Promise<KnowledgeMeta | null> {
  try {
    return JSON.parse(await fs.readFile(META_PATH, "utf8")) as KnowledgeMeta;
  } catch {
    return null;
  }
}

interface KnowledgeDoc {
  relPath: string;
  fm: KnowledgeFrontmatter;
  body: string;
  hash: string;
}

async function walkMarkdown(relDir: string): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(resolveInVault(relDir), { withFileTypes: true });
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

async function collectKnowledge(): Promise<KnowledgeDoc[]> {
  const docs: KnowledgeDoc[] = [];
  for (const folder of KNOWLEDGE_FOLDERS) {
    for (const relPath of await walkMarkdown(folder)) {
      const note = await readNote<KnowledgeFrontmatter>(relPath);
      if (!note || note.frontmatter.type !== "knowledge") continue;
      const body = note.body.trim();
      if (!body) continue;
      docs.push({ relPath, fm: note.frontmatter, body, hash: hashText(body) });
    }
  }
  return docs;
}

export interface KnowledgeDocInfo {
  relPath: string;
  title: string;
  source: KnowledgeFrontmatter["source"];
  subject: string | null;
  url: string | null;
  author: string | null;
  added: string;
  chars: number;
}

/** Lists absorbed knowledge notes (metadata only) for the Library page. */
export async function listKnowledgeDocs(): Promise<KnowledgeDocInfo[]> {
  const docs = await collectKnowledge();
  return docs
    .map((d) => ({
      relPath: d.relPath,
      title: d.fm.title,
      source: d.fm.source,
      subject: d.fm.subject ?? null,
      url: d.fm.url ?? null,
      author: d.fm.author ?? null,
      added: d.fm.added ?? "",
      chars: d.body.length,
    }))
    .sort(
      (a, b) => b.added.localeCompare(a.added) || a.title.localeCompare(b.title),
    );
}

async function saveIndex(index: KnowledgeIndex): Promise<void> {
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(INDEX_PATH, JSON.stringify(index), "utf8");
  const docs = new Set(index.entries.map((e) => e.relPath)).size;
  const meta: KnowledgeMeta = {
    updatedAt: index.updatedAt,
    docs,
    chunks: index.entries.length,
  };
  await fs.writeFile(META_PATH, JSON.stringify(meta), "utf8");
}

/**
 * Chunk-aware, incremental index of the knowledge/ tree into a file
 * separate from the personal index. A note is re-chunked and re-embedded
 * only when its body hash changes; unchanged notes reuse their chunks.
 * Safe to run repeatedly.
 */
export async function indexKnowledge(): Promise<KnowledgeIndexSummary> {
  const summary: KnowledgeIndexSummary = {
    docs: 0,
    embedded: 0,
    reused: 0,
    removed: 0,
    errors: [],
  };

  const docs = await collectKnowledge();
  summary.docs = docs.length;

  const embedModel = ollamaEmbedModel();
  const previous = await loadKnowledgeIndex();
  const reusableByPath = new Map<string, KnowledgeEntry[]>();
  if (previous && previous.embedModel === embedModel) {
    for (const entry of previous.entries) {
      const list = reusableByPath.get(entry.relPath) ?? [];
      list.push(entry);
      reusableByPath.set(entry.relPath, list);
    }
  }

  const entries: KnowledgeEntry[] = [];

  for (const doc of docs) {
    const cached = reusableByPath.get(doc.relPath);
    if (cached && cached.length > 0 && cached[0].hash === doc.hash) {
      entries.push(...cached);
      summary.reused += 1;
      continue;
    }

    const chunks = chunkText(doc.body);
    const BATCH = 16;
    try {
      for (let i = 0; i < chunks.length; i += BATCH) {
        const slice = chunks.slice(i, i + BATCH);
        const vectors = await ollamaEmbed(
          slice.map((c) => c.slice(0, 8000)),
          180_000,
        );
        slice.forEach((text, j) => {
          entries.push({
            relPath: doc.relPath,
            chunk: i + j,
            title: doc.fm.title,
            source: doc.fm.source,
            url: doc.fm.url ?? null,
            subject: doc.fm.subject ?? null,
            hash: doc.hash,
            text,
            embedding: vectors[j],
          });
        });
      }
      if (chunks.length > 0) summary.embedded += 1;
    } catch (error) {
      summary.errors.push(
        `embed ${doc.relPath}: ${error instanceof Error ? error.message : "failed"}`,
      );
    }
  }

  const livePaths = new Set(docs.map((d) => d.relPath));
  if (previous) {
    const removedPaths = new Set(
      previous.entries
        .map((e) => e.relPath)
        .filter((p) => !livePaths.has(p)),
    );
    summary.removed = removedPaths.size;
  }

  await saveIndex({
    embedModel,
    updatedAt: new Date().toISOString(),
    entries,
  });

  return summary;
}
