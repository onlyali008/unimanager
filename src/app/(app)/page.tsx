import Link from "next/link";
import { ArrowRight, FolderOpen } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
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

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <FolderOpen className="size-5" />
            </div>
            <div className="space-y-1">
              <CardTitle>Vault connected</CardTitle>
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DOMAINS.map((domain) => (
          <Link
            key={domain.slug}
            href={`/${domain.slug}`}
            className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className="h-full transition-colors group-hover:border-ring/40">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted",
                      domain.textClass,
                    )}
                  >
                    <domain.icon className="size-4.5" />
                  </div>
                  <CardTitle className="text-base">{domain.label}</CardTitle>
                  <ArrowRight className="ml-auto size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </CardHeader>
              <CardContent className="flex items-end justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  {domain.description}
                </p>
                <Badge variant="outline" className="shrink-0">
                  {stats.counts[domain.slug]}
                </Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
