import { NextResponse } from "next/server";

import { indexKnowledge } from "@/lib/ai/knowledge";
import { ollamaAvailable } from "@/lib/ai/ollama";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Re-embeds the knowledge index (incremental — only changed notes). */
export async function POST() {
  if (!(await ollamaAvailable())) {
    return NextResponse.json(
      {
        error:
          "Ollama isn't reachable — start it (ollama serve) with nomic-embed-text pulled, then re-run.",
      },
      { status: 503 },
    );
  }

  try {
    const index = await indexKnowledge();
    return NextResponse.json({ index });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Indexing failed" },
      { status: 500 },
    );
  }
}
