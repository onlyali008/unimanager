import type { Metadata } from "next";
import { BookText, FileStack, Globe, Layers, Newspaper } from "lucide-react";

import { KnowledgeControls } from "@/components/knowledge-controls";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card } from "@/components/ui/card";
import {
  listKnowledgeDocs,
  loadKnowledgeMeta,
  type KnowledgeDocInfo,
} from "@/lib/ai/knowledge";
import { loadSources, suggestedSubjects } from "@/lib/ai/knowledge/sources";

export const metadata: Metadata = { title: "Library" };
export const dynamic = "force-dynamic";

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

const SOURCE_META = {
  book: { label: "Books", icon: BookText, accent: "text-academics" },
  wiki: { label: "Wikis", icon: Globe, accent: "text-sleep" },
  article: { label: "Articles", icon: Newspaper, accent: "text-nutrition" },
} as const;

function DocList({
  source,
  docs,
}: {
  source: keyof typeof SOURCE_META;
  docs: KnowledgeDocInfo[];
}) {
  if (docs.length === 0) return null;
  const meta = SOURCE_META[source];
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <meta.icon className={`size-4 ${meta.accent}`} />
        <h2 className="font-heading text-lg font-bold">{meta.label}</h2>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {String(docs.length).padStart(2, "0")}
        </span>
      </div>
      <Card className="divide-y divide-border py-0">
        {docs.map((doc) => (
          <div
            key={doc.relPath}
            className="flex items-start justify-between gap-4 px-4 py-3"
          >
            <div className="min-w-0 space-y-0.5">
              <p className="truncate font-medium">{doc.title}</p>
              <p className="truncate font-mono text-[0.7rem] tracking-wide text-muted-foreground">
                {[
                  doc.author,
                  doc.subject,
                  hostOf(doc.url),
                ]
                  .filter(Boolean)
                  .join(" · ") || doc.relPath}
              </p>
            </div>
            <div className="shrink-0 text-right font-mono text-[0.7rem] tabular-nums text-muted-foreground">
              <div>{doc.added || "—"}</div>
              <div>
                {doc.chars < 1000
                  ? `${doc.chars} chars`
                  : `${Math.round(doc.chars / 1000)}k chars`}
              </div>
            </div>
          </div>
        ))}
      </Card>
    </section>
  );
}

export default async function LibraryPage() {
  const [meta, docs, sources, suggested] = await Promise.all([
    loadKnowledgeMeta(),
    listKnowledgeDocs(),
    loadSources(),
    suggestedSubjects(),
  ]);

  const lastIndexed = meta?.updatedAt
    ? meta.updatedAt.slice(0, 16).replace("T", " ")
    : "never";

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader
        title="Library"
        description="Absorbed reference material the assistant draws on — drop PDF/EPUB/txt/md into knowledge/inbox/, or pull wikis, URLs, and feeds."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Documents"
          value={String(docs.length)}
          icon={FileStack}
          accentClass="text-academics"
        />
        <StatCard
          label="Chunks indexed"
          value={String(meta?.chunks ?? 0)}
          icon={Layers}
          accentClass="text-nutrition"
        />
        <StatCard
          label="Last indexed"
          value={lastIndexed}
          sub="knowledge index"
          accentClass="text-sleep"
        />
      </div>

      <div className="mb-8">
        <KnowledgeControls initialSources={sources} suggested={suggested} />
      </div>

      {docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 border border-dashed border-border py-16 text-center">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Library is empty
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Drop a document into{" "}
            <code className="font-mono text-xs">knowledge/inbox/</code> and hit
            Ingest, or add a subject/feed above and Pull.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <DocList source="book" docs={docs.filter((d) => d.source === "book")} />
          <DocList source="wiki" docs={docs.filter((d) => d.source === "wiki")} />
          <DocList
            source="article"
            docs={docs.filter((d) => d.source === "article")}
          />
        </div>
      )}
    </div>
  );
}
