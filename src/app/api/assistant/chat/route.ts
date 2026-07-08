import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

import { providerFor, isProviderConfigured, CHAT_MODELS } from "@/lib/ai/providers";
import { retrieveContext } from "@/lib/ai/retrieval";
import { todayISO } from "@/lib/vault/dates";

export const maxDuration = 120;

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";
const MAX_TURNS = 20;

// Stable system prompt — volatile context (date, retrieval) goes in the
// user turn so this prefix stays byte-identical across requests.
const SYSTEM = `You are the assistant inside Semestra, a personal life-management app for one university student. Their life is logged as markdown notes in an Obsidian vault: nutrition, fitness, sleep, wellness (mood/energy/stress), academics (courses and deadlines), finances (CAD), daily notes, and weekly AI-generated insight notes.

Each user message may include a <vault_context> block with notes retrieved for the question. Treat it as the ground truth about the user's life:
- Base answers on it and cite concrete numbers and dates from it.
- Prefer patterns from insight notes over raw logs when both are present.
- If the context doesn't contain what's needed, say so plainly and suggest what to log or which page to check — never invent data.

A message may also include a <reference_knowledge> block: passages from books, articles, and wikis the user has added to their knowledge base. This is external reference material, NOT facts about the user's life:
- Use it to explain, teach, or answer knowledge questions, and cite the source by its title.
- Never present reference material as something the user did or logged; keep it distinct from <vault_context>.
- When the two combine (e.g. applying a book's idea to the user's own data), make clear which is which.

Be a calm, concise study companion: direct answers first, short practical suggestions, no lectures, no generic wellness platitudes.`;

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: NextRequest) {
  let turns: ChatTurn[];
  let requestedModel = DEFAULT_MODEL;
  try {
    const body = (await request.json()) as {
      messages?: ChatTurn[];
      model?: string;
    };
    if (typeof body.model === "string" && body.model.trim()) {
      requestedModel = body.model.trim();
    }
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

  // Resolve the provider for the requested model.
  const model = CHAT_MODELS.some((m) => m.id === requestedModel)
    ? requestedModel
    : DEFAULT_MODEL;
  const provider = providerFor(model);
  if (!provider) {
    return NextResponse.json(
      { error: `Unknown model "${model}".` },
      { status: 400 },
    );
  }
  if (!isProviderConfigured(provider)) {
    return NextResponse.json(
      {
        error: `${provider.label} isn't configured — add ${provider.envKey} to .env.local and restart.`,
      },
      { status: 503 },
    );
  }

  turns = turns.slice(-MAX_TURNS);
  // The chat APIs require the first turn to be a user turn; trimming an
  // alternating history can leave an assistant turn in front.
  while (turns.length > 0 && turns[0].role !== "user") {
    turns.shift();
  }

  const question = turns.at(-1)!.content;
  const retrieval = await retrieveContext(question);
  const contextBlock =
    retrieval.snippets.length > 0
      ? `<vault_context mode="${retrieval.mode}">\n${retrieval.snippets
          .map((s) => `--- ${s.relPath} ---\n${s.text}`)
          .join("\n\n")}\n</vault_context>\n\n`
      : "";
  const knowledgeBlock =
    retrieval.knowledge.length > 0
      ? `<reference_knowledge>\n${retrieval.knowledge
          .map(
            (k) =>
              `--- ${k.title} (${k.source}${k.url ? `, ${k.url}` : ""}) ---\n${k.text}`,
          )
          .join("\n\n")}\n</reference_knowledge>\n\n`
      : "";

  // Augment only the final user turn with retrieval + today's date.
  const augmented = turns.map((t, i) =>
    i === turns.length - 1
      ? {
          role: t.role,
          content: `${contextBlock}${knowledgeBlock}Today is ${todayISO()}.\n\n${t.content}`,
        }
      : { role: t.role, content: t.content },
  );

  const headers = {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Semestra-Sources": encodeURIComponent(
      JSON.stringify(
        [
          ...retrieval.snippets.map((s) => s.relPath),
          ...retrieval.knowledge.map((k) => k.ref),
        ].slice(0, 12),
      ),
    ),
    "X-Semestra-Retrieval": retrieval.mode,
    "X-Semestra-Model": model,
  };

  try {
    const body =
      provider.style === "anthropic"
        ? anthropicStream(model, augmented)
        : await openAIStream(provider.baseURL!, provider.envKey, model, augmented);
    return new Response(body, { headers });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Native Anthropic SDK streaming → plain-text ReadableStream. */
function anthropicStream(
  model: string,
  augmented: ChatTurn[],
): ReadableStream<Uint8Array> {
  const client = new Anthropic();
  // Adaptive thinking is supported on Opus 4.6+, Sonnet 5/4.6, and Fable 5 —
  // but not on Haiku. Omit it there to avoid a 400.
  const useThinking = !/haiku/i.test(model);
  const stream = client.messages.stream({
    model,
    max_tokens: 4096,
    ...(useThinking ? { thinking: { type: "adaptive" as const } } : {}),
    system: SYSTEM,
    messages: augmented as Anthropic.MessageParam[],
  });

  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      stream.on("text", (delta) => controller.enqueue(encoder.encode(delta)));
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
}

/**
 * OpenAI-compatible /chat/completions streaming (OpenAI, Kimi, Qwen, DeepSeek,
 * Gemini, Grok, Groq, OpenRouter, local Ollama) → plain-text ReadableStream.
 * We deliberately send only messages + stream to stay compatible across
 * providers that disagree on token-limit and sampling parameter names.
 */
async function openAIStream(
  baseURL: string,
  envKey: string,
  model: string,
  augmented: ChatTurn[],
): Promise<ReadableStream<Uint8Array>> {
  const key = envKey ? process.env[envKey] : "";
  const upstream = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [{ role: "system", content: SYSTEM }, ...augmented],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = (await upstream.text().catch(() => "")).slice(0, 400);
    throw new UpstreamError(
      `Provider returned ${upstream.status}${detail ? `: ${detail}` : ""}`,
      upstream.status,
    );
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const raw of lines) {
        const line = raw.trim();
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") {
          controller.close();
          return;
        }
        try {
          const json = JSON.parse(data) as {
            choices?: { delta?: { content?: string } }[];
          };
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) controller.enqueue(encoder.encode(delta));
        } catch {
          // Ignore keep-alive comments / partial frames.
        }
      }
    },
    cancel() {
      void reader.cancel();
    },
  });
}

class UpstreamError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function errorResponse(error: unknown) {
  if (error instanceof Anthropic.AuthenticationError) {
    return NextResponse.json(
      { error: "Anthropic API key was rejected — check ANTHROPIC_API_KEY." },
      { status: 401 },
    );
  }
  if (error instanceof Anthropic.RateLimitError) {
    return NextResponse.json(
      { error: "Rate limited by the model provider — try again shortly." },
      { status: 429 },
    );
  }
  if (error instanceof Anthropic.APIError) {
    return NextResponse.json(
      { error: `Model provider error: ${error.message}` },
      { status: 502 },
    );
  }
  if (error instanceof UpstreamError) {
    const status = error.status === 401 || error.status === 429 ? error.status : 502;
    return NextResponse.json({ error: error.message }, { status });
  }
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Chat failed" },
    { status: 500 },
  );
}
