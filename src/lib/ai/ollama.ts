/**
 * Minimal Ollama client for the local AI jobs (tagging, embeddings,
 * weekly insights). No SDK — Ollama's HTTP API is two endpoints.
 */

export function ollamaUrl(): string {
  return (process.env.OLLAMA_URL ?? "http://localhost:11434").replace(
    /\/$/,
    "",
  );
}

export function ollamaChatModel(): string {
  return process.env.OLLAMA_MODEL ?? "llama3.2:3b";
}

export function ollamaEmbedModel(): string {
  return process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text";
}

export async function ollamaAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${ollamaUrl()}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function ollamaChat(
  system: string,
  user: string,
  timeoutMs = 120_000,
): Promise<string> {
  const res = await fetch(`${ollamaUrl()}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: ollamaChatModel(),
      stream: false,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    throw new Error(`Ollama chat failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { message?: { content?: string } };
  return data.message?.content ?? "";
}

/** Batch-embeds texts; returns one vector per input. */
export async function ollamaEmbed(
  texts: string[],
  timeoutMs = 120_000,
): Promise<number[][]> {
  if (texts.length === 0) return [];
  const res = await fetch(`${ollamaUrl()}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: ollamaEmbedModel(), input: texts }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    throw new Error(`Ollama embed failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { embeddings?: number[][] };
  if (!data.embeddings || data.embeddings.length !== texts.length) {
    throw new Error("Ollama embed returned an unexpected shape");
  }
  return data.embeddings;
}
