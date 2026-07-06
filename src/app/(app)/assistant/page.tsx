import type { Metadata } from "next";

import { AiJobButtons, AssistantChat } from "@/components/assistant-chat";
import { PageHeader } from "@/components/page-header";
import { loadIndex } from "@/lib/ai/indexer";
import { ollamaAvailable } from "@/lib/ai/ollama";

export const metadata: Metadata = { title: "Assistant" };
export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const [ollamaUp, index] = await Promise.all([
    ollamaAvailable(),
    loadIndex(),
  ]);
  const anthropicConfigured = Boolean(process.env.ANTHROPIC_API_KEY);

  const ollamaHint = !ollamaUp
    ? "Ollama is offline — chat falls back to recent notes; start Ollama for semantic search."
    : index
      ? `Index: ${index.entries.length} notes, updated ${index.updatedAt.slice(0, 16).replace("T", " ")}`
      : "No index yet — run “Update index” once.";

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        title="Assistant"
        description="Claude, grounded in your vault — answers cite the notes they came from."
      />
      <div className="space-y-4">
        <AssistantChat anthropicConfigured={anthropicConfigured} />
        <AiJobButtons ollamaHint={ollamaHint} />
      </div>
    </div>
  );
}
