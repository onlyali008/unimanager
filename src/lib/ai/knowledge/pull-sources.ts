import { createHash } from "node:crypto";

import { extract as extractArticle } from "@extractus/article-extractor";
import { extract as extractFeed } from "@extractus/feed-extractor";

import { readNote, writeNote } from "@/lib/vault/fs";
import { todayISO } from "@/lib/vault/dates";
import type { KnowledgeFrontmatter } from "@/lib/vault/types";

import { htmlToText } from "./parse";
import { loadSources } from "./sources";

export interface PullSummary {
  wikis: { subject: string; title: string }[];
  articles: { title: string; url: string }[];
  skipped: { source: string; reason: string }[];
  errors: string[];
}

const UA = "Semestra/1.0 (personal knowledge base; local self-hosted)";
const FETCH_TIMEOUT = 20_000;
const MIN_CHARS = 200;
const FEED_ENTRIES_CAP = 5;

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      .replace(/-+$/g, "") || "item"
  );
}

function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/** Writes a knowledge note, skipping the write when the body is unchanged. */
async function writeKnowledge(
  relPath: string,
  fm: Omit<KnowledgeFrontmatter, "type" | "tags" | "created" | "hash" | "added">,
  body: string,
): Promise<"written" | "unchanged"> {
  const hash = hashText(body);
  const existing = await readNote<KnowledgeFrontmatter>(relPath);
  if (existing?.frontmatter.hash === hash) return "unchanged";
  const frontmatter: KnowledgeFrontmatter = {
    type: "knowledge",
    tags: existing?.frontmatter.tags ?? [],
    created: existing?.frontmatter.created ?? new Date().toISOString(),
    added: todayISO(),
    hash,
    ...fm,
  };
  await writeNote(relPath, { ...frontmatter }, body);
  return "written";
}

/* --------------------------------- Wikipedia -------------------------------- */

interface WikiPage {
  title: string;
  extract: string;
}

async function wikiSearch(subject: string, limit: number): Promise<string[]> {
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&format=json&list=search" +
    `&srlimit=${limit}&srsearch=${encodeURIComponent(subject)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
  });
  if (!res.ok) throw new Error(`wiki search ${res.status}`);
  const data = (await res.json()) as {
    query?: { search?: { title: string }[] };
  };
  return (data.query?.search ?? []).map((s) => s.title);
}

async function wikiExtract(title: string): Promise<WikiPage | null> {
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts" +
    `&explaintext=1&redirects=1&titles=${encodeURIComponent(title)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
  });
  if (!res.ok) throw new Error(`wiki extract ${res.status}`);
  const data = (await res.json()) as {
    query?: { pages?: Record<string, { title: string; extract?: string }> };
  };
  const page = Object.values(data.query?.pages ?? {})[0];
  if (!page?.extract) return null;
  return { title: page.title, extract: page.extract };
}

async function pullWikis(
  subject: string,
  limit: number,
  summary: PullSummary,
): Promise<void> {
  let titles: string[];
  try {
    titles = await wikiSearch(subject, limit);
  } catch (error) {
    summary.errors.push(
      `wiki "${subject}": ${error instanceof Error ? error.message : "search failed"}`,
    );
    return;
  }
  const subjectSlug = slugify(subject);
  for (const title of titles) {
    try {
      const page = await wikiExtract(title);
      if (!page || page.extract.length < MIN_CHARS) continue;
      const relPath = `knowledge/wikis/${subjectSlug}/${slugify(page.title)}.md`;
      const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(
        page.title.replace(/ /g, "_"),
      )}`;
      const result = await writeKnowledge(
        relPath,
        {
          source: "wiki",
          title: page.title,
          author: null,
          url: wikiUrl,
          subject,
        },
        page.extract.trim(),
      );
      if (result === "written") {
        summary.wikis.push({ subject, title: page.title });
      }
    } catch (error) {
      summary.errors.push(
        `wiki "${title}": ${error instanceof Error ? error.message : "extract failed"}`,
      );
    }
  }
}

/* ------------------------------ URLs & RSS feeds ----------------------------- */

async function pullArticle(url: string, summary: PullSummary): Promise<void> {
  try {
    const article = await extractArticle(
      url,
      {},
      { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(FETCH_TIMEOUT) },
    );
    if (!article?.content) {
      summary.skipped.push({ source: url, reason: "no extractable article" });
      return;
    }
    const text = htmlToText(article.content);
    if (text.length < MIN_CHARS) {
      summary.skipped.push({ source: url, reason: "article too short" });
      return;
    }
    const title = article.title?.trim() || url;
    // Stable filename per URL so daily re-pulls update in place, not pile up.
    const relPath = `knowledge/reference/${slugify(title)}-${hashText(url).slice(0, 6)}.md`;
    const result = await writeKnowledge(
      relPath,
      {
        source: "article",
        title,
        author: article.author?.trim() || null,
        url,
        subject: null,
      },
      text,
    );
    if (result === "written") summary.articles.push({ title, url });
  } catch (error) {
    summary.errors.push(
      `url ${url}: ${error instanceof Error ? error.message : "fetch failed"}`,
    );
  }
}

async function pullFeed(feedUrl: string, summary: PullSummary): Promise<void> {
  let links: string[];
  try {
    const feed = await extractFeed(
      feedUrl,
      {},
      { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(FETCH_TIMEOUT) },
    );
    links = (feed.entries ?? [])
      .map((e) => e.link)
      .filter((l): l is string => Boolean(l))
      .slice(0, FEED_ENTRIES_CAP);
  } catch (error) {
    summary.errors.push(
      `feed ${feedUrl}: ${error instanceof Error ? error.message : "read failed"}`,
    );
    return;
  }
  for (const link of links) {
    await pullArticle(link, summary);
  }
}

/**
 * The daily job: gathers Wikipedia articles for each enabled subject and
 * extracts readable text from configured URLs and RSS feeds, writing each
 * into the knowledge/ tree. De-duplicates by content hash so re-runs update
 * in place. The caller re-indexes afterward.
 */
export async function pullSources(): Promise<PullSummary> {
  const summary: PullSummary = {
    wikis: [],
    articles: [],
    skipped: [],
    errors: [],
  };
  const sources = await loadSources();

  for (const subject of sources.subjects) {
    await pullWikis(subject, sources.articlesPerSubject, summary);
  }
  for (const url of sources.urls) {
    await pullArticle(url, summary);
  }
  for (const feed of sources.feeds) {
    await pullFeed(feed, summary);
  }

  return summary;
}
