import { NextResponse } from "next/server";

import { generateWeeklyInsight } from "@/lib/ai/insights";
import { ollamaAvailable } from "@/lib/ai/ollama";

export async function POST() {
  if (!(await ollamaAvailable())) {
    return NextResponse.json(
      {
        error:
          "Ollama isn't reachable — start it (ollama serve) and make sure llama3.2:3b is pulled.",
      },
      { status: 503 },
    );
  }
  try {
    const summary = await generateWeeklyInsight();
    return NextResponse.json({ summary });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Insight generation failed",
      },
      { status: 500 },
    );
  }
}
