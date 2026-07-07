import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { readNote, resolveInVault, writeNote } from "@/lib/vault/fs";
import { todayISO } from "@/lib/vault/dates";
import type { KnowledgeFrontmatter } from "@/lib/vault/types";

import { parseFile, SUPPORTED_EXTENSIONS } from "./parse";

export interface IngestSummary {
  absorbed: { title: string; relPath: string; chars: number }[];
  skipped: { file: string; reason: string }[];
  errors: string[];
}

const INBOX = "knowledge/inbox";
const BOOKS = "knowledge/books";
const ORIGINALS = "knowledge/books/_originals";
const MIN_CHARS = 200;

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return slug || "document";
}

function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

async function moveOriginal(fileName: string): Promise<void> {
  const from = resolveInVault(`${INBOX}/${fileName}`);
  await fs.mkdir(resolveInVault(ORIGINALS), { recursive: true });
  const to = resolveInVault(`${ORIGINALS}/${fileName}`);
  try {
    await fs.rename(from, to);
  } catch {
    // Fallback for cross-device or locked-file cases.
    await fs.copyFile(from, to);
    await fs.unlink(from);
  }
}

/**
 * Absorbs every supported file in knowledge/inbox/ into a knowledge note
 * (one <slug>.md per document, cleaned text in the body), de-duplicating by
 * content hash and moving originals to books/_originals/. Returns a report;
 * the caller re-indexes afterward.
 */
export async function ingestInbox(): Promise<IngestSummary> {
  const summary: IngestSummary = { absorbed: [], skipped: [], errors: [] };

  let dirents;
  try {
    dirents = await fs.readdir(resolveInVault(INBOX), { withFileTypes: true });
  } catch {
    return summary; // inbox doesn't exist yet — nothing to do
  }

  for (const dirent of dirents) {
    if (!dirent.isFile()) continue;
    const fileName = dirent.name;
    if (fileName.startsWith(".") || fileName.startsWith("_")) continue;

    const ext = path.extname(fileName).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      summary.skipped.push({ file: fileName, reason: `unsupported type ${ext}` });
      continue;
    }

    try {
      const parsed = await parseFile(resolveInVault(`${INBOX}/${fileName}`));
      const text = parsed.text.trim();
      if (text.length < MIN_CHARS) {
        summary.skipped.push({
          file: fileName,
          reason: "no extractable text (scanned image or empty?)",
        });
        continue;
      }

      const hash = hashText(text);
      const baseSlug = slugify(parsed.title);
      let relPath = `${BOOKS}/${baseSlug}.md`;
      const existing = await readNote<KnowledgeFrontmatter>(relPath);
      if (existing?.frontmatter.hash === hash) {
        summary.skipped.push({ file: fileName, reason: "already absorbed" });
        await moveOriginal(fileName);
        continue;
      }
      // Same slug, different content — keep both.
      if (existing) relPath = `${BOOKS}/${baseSlug}-${hash.slice(0, 8)}.md`;

      const frontmatter: KnowledgeFrontmatter = {
        type: "knowledge",
        source: "book",
        title: parsed.title,
        author: parsed.author,
        url: null,
        subject: null,
        added: todayISO(),
        hash,
        tags: [],
        created: new Date().toISOString(),
      };
      await writeNote(relPath, { ...frontmatter }, text);
      await moveOriginal(fileName);
      summary.absorbed.push({
        title: parsed.title,
        relPath,
        chars: text.length,
      });
    } catch (error) {
      summary.errors.push(
        `${fileName}: ${error instanceof Error ? error.message : "parse failed"}`,
      );
    }
  }

  return summary;
}
