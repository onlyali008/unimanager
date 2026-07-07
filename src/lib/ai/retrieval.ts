import { lastNDates } from "@/lib/vault/dates";

import { loadIndex, type IndexEntry } from "./indexer";
import { retrieveKnowledge, type KnowledgeSnippet } from "./knowledge/retrieve";
import { collectNotes } from "./notes";
import { ollamaAvailable, ollamaEmbed } from "./ollama";

export interface RetrievedSnippet {
  relPath: string;
  type: string;
  date: string | null;
  text: string;
}

export interface RetrievalResult {
  snippets: RetrievedSnippet[];
  /** Reference-knowledge passages (books/wikis/articles), gated by relevance. */
  knowledge: KnowledgeSnippet[];
  /** "semantic" via the embeddings index, or "recency" fallback. */
  mode: "semantic" | "recency";
}

const TOP_K = 8;
const CHAR_BUDGET = 7000;

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

function scoreEntry(
  entry: IndexEntry,
  similarity: number,
  recentDates: Set<string>,
): number {
  let score = similarity;
  // Insight notes are distilled knowledge — prefer them over raw logs.
  if (entry.type === "insight") score += 0.15;
  // Mild recency preference among otherwise similar notes.
  if (entry.date && recentDates.has(entry.date)) score += 0.05;
  return score;
}

function capByBudget(snippets: RetrievedSnippet[]): RetrievedSnippet[] {
  const result: RetrievedSnippet[] = [];
  let used = 0;
  for (const s of snippets) {
    const text = s.text.slice(0, 2000);
    if (used + text.length > CHAR_BUDGET) break;
    result.push({ ...s, text });
    used += text.length;
  }
  return result;
}

/** Recency digest of personal notes when semantic search isn't available. */
async function recencyPersonal(): Promise<RetrievedSnippet[]> {
  const notes = await collectNotes();
  const recentDates = new Set(lastNDates(7));
  const insights = notes
    .filter((n) => n.type === "insight")
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .slice(0, 2);
  const recent = notes
    .filter((n) => n.date !== null && recentDates.has(n.date))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .slice(0, 10);
  return capByBudget(
    [...insights, ...recent].map((n) => ({
      relPath: n.relPath,
      type: n.type,
      date: n.date,
      text: n.text,
    })),
  );
}

function semanticPersonal(
  entries: IndexEntry[],
  queryVector: number[],
): RetrievedSnippet[] {
  const recentDates = new Set(lastNDates(7));
  const ranked = entries
    .map((entry) => ({
      entry,
      score: scoreEntry(entry, cosine(queryVector, entry.embedding), recentDates),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K)
    .map(({ entry }) => ({
      relPath: entry.relPath,
      type: entry.type,
      date: entry.date,
      text: entry.text,
    }));
  return capByBudget(ranked);
}

/**
 * Retrieves context for an assistant question. Embeds the query once and
 * uses it for two independent sources: semantic search over the personal
 * embeddings index (with a recency fallback), and relevance-gated search
 * over the separate knowledge base. Either can be empty; knowledge works
 * even before any personal note is indexed.
 */
export async function retrieveContext(query: string): Promise<RetrievalResult> {
  const ollamaUp = await ollamaAvailable();
  let queryVector: number[] | null = null;
  if (ollamaUp) {
    try {
      [queryVector] = await ollamaEmbed([query], 20_000);
    } catch {
      queryVector = null;
    }
  }

  const index = await loadIndex();
  let snippets: RetrievedSnippet[];
  let mode: RetrievalResult["mode"];
  if (index && index.entries.length > 0 && queryVector) {
    snippets = semanticPersonal(index.entries, queryVector);
    mode = "semantic";
  } else {
    snippets = await recencyPersonal();
    mode = "recency";
  }

  const knowledge = queryVector ? await retrieveKnowledge(queryVector) : [];

  return { snippets, knowledge, mode };
}
