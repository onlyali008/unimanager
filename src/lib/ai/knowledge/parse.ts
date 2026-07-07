import { promises as fs } from "node:fs";
import path from "node:path";

import { EPub } from "epub2";
import { extractText, getDocumentProxy } from "unpdf";

export interface ParsedDoc {
  title: string;
  author: string | null;
  text: string;
}

/** Decodes the handful of HTML entities that survive tag-stripping. */
function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;|&rsquo;|&lsquo;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

/** Best-effort HTML → readable plain text. Shared by EPUB and article HTML. */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<\/(p|div|section|article|h[1-6]|li|tr|blockquote)>/gi, "\n\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Filename without extension, tidied into a human title. */
function titleFromFile(filePath: string): string {
  return path
    .basename(filePath, path.extname(filePath))
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function parsePdf(absPath: string): Promise<string> {
  const buffer = await fs.readFile(absPath);
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

async function parseEpub(absPath: string): Promise<ParsedDoc> {
  const epub = await EPub.createAsync(absPath);
  const parts: string[] = [];
  for (const chapter of epub.flow) {
    if (!chapter.id) continue;
    try {
      parts.push(htmlToText(await epub.getChapterAsync(chapter.id)));
    } catch {
      // Skip unreadable chapters rather than failing the whole book.
    }
  }
  return {
    title: epub.metadata.title?.trim() || titleFromFile(absPath),
    author: epub.metadata.creator?.trim() || null,
    text: parts.filter(Boolean).join("\n\n"),
  };
}

/**
 * Parses a dropped file into clean text. Supports txt/md (direct),
 * PDF (unpdf), EPUB (epub2), and html (tag-stripped). Throws on an
 * unsupported extension so the caller can report it.
 */
export async function parseFile(absPath: string): Promise<ParsedDoc> {
  const ext = path.extname(absPath).toLowerCase();
  switch (ext) {
    case ".txt":
    case ".md":
    case ".markdown":
      return {
        title: titleFromFile(absPath),
        author: null,
        text: (await fs.readFile(absPath, "utf8")).trim(),
      };
    case ".pdf":
      return {
        title: titleFromFile(absPath),
        author: null,
        text: (await parsePdf(absPath)).trim(),
      };
    case ".epub":
      return parseEpub(absPath);
    case ".html":
    case ".htm":
      return {
        title: titleFromFile(absPath),
        author: null,
        text: htmlToText(await fs.readFile(absPath, "utf8")),
      };
    default:
      throw new Error(`Unsupported file type: ${ext || "(none)"}`);
  }
}

export const SUPPORTED_EXTENSIONS = [
  ".txt",
  ".md",
  ".markdown",
  ".pdf",
  ".epub",
  ".html",
  ".htm",
];
