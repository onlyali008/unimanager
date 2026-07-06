import { NextRequest, NextResponse } from "next/server";

import { indexVault } from "@/lib/ai/indexer";
import { ollamaAvailable } from "@/lib/ai/ollama";

export async function POST(request: NextRequest) {
  if (!(await ollamaAvailable())) {
    return NextResponse.json(
      {
        error:
          "Ollama isn't reachable — start it (ollama serve) and make sure llama3.2:3b and nomic-embed-text are pulled.",
      },
      { status: 503 },
    );
  }

  let tag = true;
  try {
    const body = (await request.json()) as { tag?: boolean };
    if (typeof body.tag === "boolean") tag = body.tag;
  } catch {
    // Empty body — keep defaults.
  }

  try {
    const summary = await indexVault({ tag });
    return NextResponse.json({ summary });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Indexing failed" },
      { status: 500 },
    );
  }
}
