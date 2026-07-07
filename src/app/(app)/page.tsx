import Link from "next/link";
import { ArrowRight, FolderOpen } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
        description="Everything you track, in one calm place. Entries live as markdown notes in your Obsidian vault."
      />

      <Card className="relative mb-6 py-0">
        <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-primary" />
        <CardHeader className="py-4 pl-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center border border-border bg-muted text-muted-foreground">
              <FolderOpen className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="label-mono">Source / Vault Connected</p>
              <CardDescription className="font-mono text-xs break-all">
                {stats.path}
              </CardDescription>
            </div>
            <Badge variant="secondary" className="ml-auto">
              {stats.totalNotes} {stats.totalNotes === 1 ? "note" : "notes"}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <p className="label-mono mb-3">Case Files / Six Sections</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DOMAINS.map((domain, i) => (
          <Link
            key={domain.slug}
            href={`/${domain.slug}`}
            className="group outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card
              className={cn(
                "relative h-full py-0 transition-transform group-hover:-translate-y-0.5 group-hover:shadow-hard",
                domain.textClass,
              )}
            >
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 w-1 bg-current"
              />
              <div className="flex h-full flex-col gap-3 px-4 py-4 pl-5 text-foreground">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center border border-border bg-muted text-current">
                    <domain.icon className="size-4.5" />
                  </div>
                  <CardTitle className="text-base">{domain.label}</CardTitle>
                  <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <p className="flex-1 text-sm text-muted-foreground">
                  {domain.description}
                </p>
                <div className="flex items-center justify-between gap-2 border-t border-border pt-2.5">
                  <span className="label-mono">Entries</span>
                  <span className="flex items-center gap-1.5 font-mono text-sm font-semibold tabular-nums">
                    {stats.counts[domain.slug]}
                    <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
