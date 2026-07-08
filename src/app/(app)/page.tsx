import Link from "next/link";
import { ArrowRight, FolderOpen } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { DOMAINS } from "@/lib/domains";
import { getVaultStats } from "@/lib/vault";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const stats = await getVaultStats();

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Overview"
        eyebrow={`${stats.totalNotes} entries · ${DOMAINS.length} sections`}
        description="Everything you track, in one calm place. Entries live as markdown notes in your Obsidian vault."
      />

      {/* Vault source — a slim status strip, not a box. */}
      <div className="mb-10 flex items-center gap-3 border border-border bg-card px-4 py-3">
        <div className="flex size-9 shrink-0 items-center justify-center border border-border bg-muted text-muted-foreground">
          <FolderOpen className="size-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="label-mono">Vault connected</p>
          <p className="truncate font-mono text-xs text-muted-foreground">
            {stats.path}
          </p>
        </div>
        <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">
          {stats.totalNotes}
          <span className="ml-1 text-[0.65rem] font-normal uppercase tracking-[0.12em] text-muted-foreground">
            {stats.totalNotes === 1 ? "note" : "notes"}
          </span>
        </span>
      </div>

      <div className="mb-1 flex items-center gap-3">
        <span className="label-mono">Six sections</span>
        <span aria-hidden className="h-px flex-1 bg-border" />
      </div>

      {/* Editorial contents list — index, section, count. */}
      <div className="border-t-2 border-foreground">
        {DOMAINS.map((domain, i) => (
          <Link
            key={domain.slug}
            href={`/${domain.slug}`}
            className="group grid grid-cols-[2.25rem_2.25rem_1fr_auto] items-center gap-4 border-b border-border px-1.5 py-4 outline-none transition-[padding,background-color] hover:bg-muted hover:pl-3 focus-visible:bg-muted"
          >
            <span className="font-heading text-2xl font-extrabold tracking-[-0.03em] text-muted-foreground/35 tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span
              className={cn(
                "flex size-9 items-center justify-center",
                domain.textClass,
              )}
            >
              <domain.icon className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="font-heading text-lg leading-tight font-bold">
                {domain.label}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {domain.description}
              </p>
            </div>
            <div className="flex items-center gap-3 justify-self-end">
              <span className="font-mono text-lg font-semibold tabular-nums">
                {stats.counts[domain.slug]}
              </span>
              <ArrowRight className="size-4.5 text-muted-foreground transition-[transform,color] group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
