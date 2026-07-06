import type { Metadata } from "next";
import { Sparkles } from "lucide-react";

import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata: Metadata = { title: "Assistant" };

export default function AssistantPage() {
  return (
    <PlaceholderPage
      title="Assistant"
      description="An AI companion that actually knows your semester."
      icon={Sparkles}
      phase="Phase 3"
      upcoming={[
        "Chat grounded in your vault via retrieval, not raw dumps",
        "Nightly local tagging and embeddings via Ollama",
        "Weekly cross-domain insight notes (sleep vs. exams vs. spending)",
      ]}
    />
  );
}
