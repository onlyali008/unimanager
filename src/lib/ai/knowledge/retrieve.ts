import { loadKnowledgeIndex } from "./index";

export interface KnowledgeSnippet {
  /** relPath#chunk, so the same book can surface multiple passages. */
  ref: string;
  title: string;
  source: string;
  url: string | null;
  text: string;
}

const TOP_K = 4;
const CHAR_BUDGET = 4500;
const PER_SNIPPET = 1600;

/**
 * Minimum cosine similarity for a knowledge chunk to be attached. This is
 * the gate that keeps book/wiki passages out of unrelated life questions;
 * tune via KNOWLEDGE_MIN_SIMILARITY if retrieval is too eager or too shy.
 *
 * Calibrated for nomic-embed-text, whose similarities are compressed:
 * measured unrelated queries cluster ~0.40–0.45 and on-topic ones ~0.75–0.85,
 * so 0.55 separates them with margin on both sides.
 */
function minSimilarity(): number {
  const raw = Number(process.env.KNOWLEDGE_MIN_SIMILARITY);
  return Number.isFinite(raw) && raw > 0 && raw < 1 ? raw : 0.55;
}

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

/**
 * Ranks knowledge chunks against a pre-computed query vector (reusing the
 * embedding the personal retrieval already made) and returns the most
 * relevant passages above the similarity gate, capped by a char budget.
 */
export async function retrieveKnowledge(
  queryVector: number[],
): Promise<KnowledgeSnippet[]> {
  const index = await loadKnowledgeIndex();
  if (!index || index.entries.length === 0) return [];

  const gate = minSimilarity();
  const ranked = index.entries
    .map((entry) => ({ entry, score: cosine(queryVector, entry.embedding) }))
    .filter((r) => r.score >= gate)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K);

  const snippets: KnowledgeSnippet[] = [];
  let used = 0;
  for (const { entry } of ranked) {
    const text = entry.text.slice(0, PER_SNIPPET);
    if (used + text.length > CHAR_BUDGET) break;
    snippets.push({
      ref: `${entry.relPath}#${entry.chunk}`,
      title: entry.title,
      source: entry.source,
      url: entry.url,
      text,
    });
    used += text.length;
  }
  return snippets;
}
