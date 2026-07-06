import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

import { retrieveContext } from "@/lib/ai/retrieval";
import { todayISO } from "@/lib/vault/dates";

export const maxDuration = 120;

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";
const MAX_TURNS = 20;

// Stable system prompt — volatile context (date, retrieval) goes in the
// user turn so this prefix stays byte-identical across requests.
const SYSTEM = `You are the assistant inside Semestra, a personal life-management app for one university student. Their life is logged as markdown notes in an Obsidian vault: nutrition, fitness, sleep, wellness (mood/energy/stress), academics (courses and deadlines), finances (CAD), daily notes, and weekly AI-generated insight notes.

Each user message may include a <vault_context> block with notes retrieved for the question. Treat it as the ground truth about the user's life:
- Base answers on it and cite concrete numbers and dates from it.
- Prefer patterns from insight notes over raw logs when both are present.
- If the context doesn't contain what's needed, say so plainly and suggest what to log or which page to check — never invent data.
- Be a calm, concise study companion: direct answers first, short practical suggestions, no lectures, no generic wellness platitudes.`;

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured in .env.local." },
      { status: 503 },
    );
  }

  let turns: ChatTurn[];
  try {
    const body = (await request.json()) as { messages?: ChatTurn[] };
    turns = (body.messages ?? []).filter(
      (t) =>
        (t.role === "user" || t.role === "assistant") &&
        typeof t.content === "string" &&
        t.content.trim().length > 0,
    );
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (turns.length === 0 || turns.at(-1)?.role !== "user") {
    return NextResponse.json(
      { error: "Send a messages array ending with a user message." },
      { status: 400 },
    );
  }
  turns = turns.slice(-MAX_TURNS);

  const question = turns.at(-1)!.content;
  const retrieval = await retrieveContext(question);
  const contextBlock =
    retrieval.snippets.length > 0
      ? `<vault_context mode="${retrieval.mode}">\n${retrieval.snippets
          .map((s) => `--- ${s.relPath} ---\n${s.text}`)
          .join("\n\n")}\n</vault_context>\n\n`
      : "";

  const messages: Anthropic.MessageParam[] = turns.map((t, i) =>
    i === turns.length - 1
      ? {
          role: "user",
          content: `${contextBlock}Today is ${todayISO()}.\n\n${t.content}`,
        }
      : { role: t.role, content: t.content },
  );

  const client = new Anthropic();

  try {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      system: SYSTEM,
      messages,
    });

    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        stream.on("text", (delta) => {
          controller.enqueue(encoder.encode(delta));
        });
        stream.on("error", (error) => {
          controller.enqueue(
            encoder.encode(
              `\n\n[error: ${error instanceof Error ? error.message : "stream failed"}]`,
            ),
          );
          controller.close();
        });
        stream.on("end", () => controller.close());
      },
      cancel() {
        stream.abort();
      },
    });

    return new Response(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Semestra-Sources": encodeURIComponent(
          JSON.stringify(
            retrieval.snippets.map((s) => s.relPath).slice(0, 8),
          ),
        ),
        "X-Semestra-Retrieval": retrieval.mode,
      },
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "Anthropic API key was rejected — check ANTHROPIC_API_KEY." },
        { status: 401 },
      );
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Rate limited by the Claude API — try again shortly." },
        { status: 429 },
      );
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Claude API error: ${error.message}` },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat failed" },
      { status: 500 },
    );
  }
}
