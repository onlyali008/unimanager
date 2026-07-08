import type { Metadata } from "next";

import { AiJobButtons, AssistantChat } from "@/components/assistant-chat";
import { PageHeader } from "@/components/page-header";
import { loadIndexMeta } from "@/lib/ai/indexer";
import { ollamaAvailable } from "@/lib/ai/ollama";
import { defaultModelId, listModelOptions } from "@/lib/ai/providers";

export const metadata: Metadata = { title: "Assistant" };
export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const [ollamaUp, meta] = await Promise.all([
    ollamaAvailable(),
    loadIndexMeta(),
  ]);

  const models = listModelOptions();
  const defaultModel = defaultModelId(models);
  const anyConfigured = models.some((m) => m.configured);

  const ollamaHint = !ollamaUp
    ? "Ollama is offline — chat falls back to recent notes; start Ollama for semantic search."
    : meta
      ? `Index: ${meta.count} notes, updated ${meta.updatedAt.slice(0, 16).replace("T", " ")}`
      : "No index yet — run “Update index” once.";

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        title="Assistant"
        eyebrow="Sem · your study companion"
        description="Grounded in your vault — answers cite the notes they came from. Switch the model per question; ingestion stays local."
      />
      <div className="space-y-4">
        <AssistantChat
          models={models}
          defaultModel={defaultModel}
          anyConfigured={anyConfigured}
        />
        <AiJobButtons ollamaHint={ollamaHint} />
      </div>
    </div>
  );
}
