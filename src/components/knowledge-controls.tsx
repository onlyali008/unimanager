"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookUp, DownloadCloud, Loader2, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface KnowledgeSources {
  subjects: string[];
  urls: string[];
  feeds: string[];
  articlesPerSubject: number;
}

const toLines = (arr: string[]) => arr.join("\n");
const fromLines = (value: string) =>
  value
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

export function KnowledgeControls({
  initialSources,
  suggested,
}: {
  initialSources: KnowledgeSources;
  suggested: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "ingest" | "pull" | "index" | "save">(
    null,
  );
  const [subjects, setSubjects] = useState(toLines(initialSources.subjects));
  const [urls, setUrls] = useState(toLines(initialSources.urls));
  const [feeds, setFeeds] = useState(toLines(initialSources.feeds));
  const [perSubject, setPerSubject] = useState(
    String(initialSources.articlesPerSubject),
  );

  const enabledSubjects = new Set(fromLines(subjects));
  const openSuggestions = suggested.filter((s) => !enabledSubjects.has(s));

  async function runJob(
    key: "ingest" | "pull" | "index",
    path: string,
    describe: (data: Record<string, unknown>) => string,
  ) {
    setBusy(key);
    try {
      const res = await fetch(path, { method: "POST" });
      const data = (await res.json()) as Record<string, unknown> & {
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
      toast.success(describe(data));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Job failed");
    } finally {
      setBusy(null);
    }
  }

  async function saveSources() {
    setBusy("save");
    try {
      const res = await fetch("/api/knowledge/sources", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjects: fromLines(subjects),
          urls: fromLines(urls),
          feeds: fromLines(feeds),
          articlesPerSubject: Number(perSubject) || 4,
        }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      toast.success("Sources saved");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={busy !== null}
          onClick={() =>
            runJob("ingest", "/api/knowledge/ingest", (d) => {
              const ing = d.ingest as { absorbed?: unknown[]; skipped?: unknown[] };
              return `Absorbed ${ing.absorbed?.length ?? 0} document(s)${
                ing.skipped?.length ? `, skipped ${ing.skipped.length}` : ""
              }`;
            })
          }
        >
          {busy === "ingest" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <BookUp className="size-4" />
          )}
          Ingest inbox
        </Button>
        <Button
          variant="outline"
          disabled={busy !== null}
          onClick={() =>
            runJob("pull", "/api/knowledge/pull", (d) => {
              const p = d.pull as { wikis?: unknown[]; articles?: unknown[] };
              return `Pulled ${p.wikis?.length ?? 0} wiki + ${
                p.articles?.length ?? 0
              } article(s)`;
            })
          }
        >
          {busy === "pull" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <DownloadCloud className="size-4" />
          )}
          Pull sources
        </Button>
        <Button
          variant="outline"
          disabled={busy !== null}
          onClick={() =>
            runJob("index", "/api/knowledge/index", (d) => {
              const i = d.index as { embedded?: number; reused?: number };
              return `Indexed — ${i.embedded ?? 0} embedded, ${i.reused ?? 0} reused`;
            })
          }
        >
          {busy === "index" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Re-index
        </Button>
      </div>

      <div className="space-y-4 border border-border bg-card p-4 shadow-hard-sm">
        <p className="label-mono">Daily Pull / Sources</p>

        <div className="space-y-1.5">
          <Label htmlFor="subjects" className="label-mono">
            Wikipedia subjects
          </Label>
          <Textarea
            id="subjects"
            rows={3}
            value={subjects}
            onChange={(e) => setSubjects(e.target.value)}
            placeholder="One subject per line, e.g. Organic chemistry"
            className="font-mono text-xs"
          />
          {openSuggestions.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="label-mono">From your courses:</span>
              {openSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() =>
                    setSubjects((prev) => (prev ? `${prev}\n${s}` : s))
                  }
                  className="stamp cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  + {s}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="urls" className="label-mono">
              Article URLs
            </Label>
            <Textarea
              id="urls"
              rows={3}
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder="One URL per line"
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="feeds" className="label-mono">
              RSS / Atom feeds
            </Label>
            <Textarea
              id="feeds"
              rows={3}
              value={feeds}
              onChange={(e) => setFeeds(e.target.value)}
              placeholder="One feed URL per line"
              className="font-mono text-xs"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="perSubject" className="label-mono">
              Articles per subject
            </Label>
            <Input
              id="perSubject"
              type="number"
              min={1}
              max={10}
              value={perSubject}
              onChange={(e) => setPerSubject(e.target.value)}
              className="w-24 font-mono"
            />
          </div>
          <Button onClick={saveSources} disabled={busy !== null}>
            {busy === "save" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Save sources
          </Button>
        </div>
      </div>
    </div>
  );
}
