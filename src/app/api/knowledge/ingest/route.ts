import { NextResponse } from "next/server";

import { ingestInbox } from "@/lib/ai/knowledge/ingest-books";
import { indexKnowledge } from "@/lib/ai/knowledge";
import { ollamaAvailable } from "@/lib/ai/ollama";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Absorbs knowledge/inbox/, then re-embeds the knowledge index. */
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
    const ingest = await ingestInbox();
    const index = await indexKnowledge();
    return NextResponse.json({ ingest, index });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ingest failed" },
      { status: 500 },
    );
  }
}
