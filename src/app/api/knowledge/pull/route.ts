import { NextResponse } from "next/server";

import { indexKnowledge } from "@/lib/ai/knowledge";
import { pullSources } from "@/lib/ai/knowledge/pull-sources";
import { ollamaAvailable } from "@/lib/ai/ollama";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * The daily job: pulls configured wikis/URLs/feeds into the vault, then
 * re-embeds the knowledge index when Ollama is up. Pulling still succeeds
 * (notes are written) even if Ollama is down — only indexing is deferred.
 */
export async function POST() {
  try {
    const pull = await pullSources();
    const canIndex = await ollamaAvailable();
    const index = canIndex ? await indexKnowledge() : null;
    return NextResponse.json({
      pull,
      index,
      indexed: canIndex,
      ...(canIndex
        ? {}
        : {
            note: "Ollama unreachable — notes were pulled but not embedded yet. Re-index once Ollama is running.",
          }),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pull failed" },
      { status: 500 },
    );
  }
}
