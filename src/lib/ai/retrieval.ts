import { lastNDates } from "@/lib/vault/dates";

import { loadIndex, type IndexEntry } from "./indexer";
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

/** Recency fallback when the embeddings index or Ollama is unavailable. */
async function recencyRetrieve(): Promise<RetrievalResult> {
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
  const snippets = [...insights, ...recent].map((n) => ({
    relPath: n.relPath,
    type: n.type,
    date: n.date,
    text: n.text,
  }));
  return { snippets: capByBudget(snippets), mode: "recency" };
}

/**
 * Retrieves vault context for an assistant question: semantic search over
 * the local embeddings index (insight notes boosted), degrading to a
 * recency digest when the index or Ollama isn't available.
 */
export async function retrieveContext(query: string): Promise<RetrievalResult> {
  const index = await loadIndex();
  if (!index || index.entries.length === 0 || !(await ollamaAvailable())) {
    return recencyRetrieve();
  }

  let queryVector: number[];
  try {
    [queryVector] = await ollamaEmbed([query], 20_000);
  } catch {
    return recencyRetrieve();
  }

  const recentDates = new Set(lastNDates(7));
  const ranked = index.entries
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

  return { snippets: capByBudget(ranked), mode: "semantic" };
}
