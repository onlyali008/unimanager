"use client";

import { useRef, useState } from "react";
import { Loader2, RefreshCw, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

export function AssistantChat({
  anthropicConfigured,
}: {
  anthropicConfigured: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollDown() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    });
  }

  async function send() {
    const question = input.trim();
    if (!question || busy) return;
    if (!anthropicConfigured) {
      toast.info("Add ANTHROPIC_API_KEY to .env.local and restart the dev server.");
      return;
    }

    const history = [...messages, { role: "user" as const, content: question }];
    setMessages(history);
    setInput("");
    setBusy(true);
    scrollDown();

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Chat failed (${res.status})`);
      }

      let sources: string[] = [];
      try {
        sources = JSON.parse(
          decodeURIComponent(res.headers.get("X-Semestra-Sources") ?? "%5B%5D"),
        ) as string[];
      } catch {
        sources = [];
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", sources },
      ]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          const last = next.at(-1);
          if (last?.role === "assistant") {
            next[next.length - 1] = { ...last, content: last.content + chunk };
          }
          return next;
        });
        scrollDown();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Chat failed");
      setMessages((prev) =>
        prev.at(-1)?.role === "assistant" && prev.at(-1)?.content === ""
          ? prev.slice(0, -1)
          : prev,
      );
    } finally {
      setBusy(false);
      scrollDown();
    }
  }

  return (
    <Card className="flex h-[60vh] flex-col">
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              <Sparkles className="size-5" />
              <p className="max-w-sm">
                Ask about your own data — &ldquo;How did I sleep during exam
                weeks?&rdquo;, &ldquo;Where did my money go this month?&rdquo;,
                &ldquo;What should I focus on this week?&rdquo;
              </p>
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap",
                  m.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted",
                )}
              >
                {m.content || (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                )}
                {m.role === "assistant" && m.sources && m.sources.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.sources.slice(0, 5).map((s) => (
                      <Badge key={s} variant="outline" className="font-mono text-[10px]">
                        {s.replace(/\.md$/, "")}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>

        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <Textarea
            rows={2}
            placeholder="Ask about your week…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            className="min-h-0 resize-none"
          />
          <Button type="submit" size="icon" disabled={busy} aria-label="Send">
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function AiJobButtons({ ollamaHint }: { ollamaHint: string | null }) {
  const [indexing, setIndexing] = useState(false);
  const [insighting, setInsighting] = useState(false);

  async function runIndex() {
    setIndexing(true);
    try {
      const res = await fetch("/api/ai/index", { method: "POST" });
      const data = (await res.json()) as {
        summary?: {
          totalNotes: number;
          embedded: number;
          tagged: number;
          errors: string[];
        };
        error?: string;
      };
      if (!res.ok || !data.summary) throw new Error(data.error ?? "Indexing failed");
      toast.success(
        `Index updated: ${data.summary.totalNotes} notes, ${data.summary.embedded} re-embedded, ${data.summary.tagged} tagged`,
        {
          description: data.summary.errors.length
            ? `${data.summary.errors.length} item(s) failed`
            : undefined,
        },
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Indexing failed");
    } finally {
      setIndexing(false);
    }
  }

  async function runInsights() {
    setInsighting(true);
    try {
      const res = await fetch("/api/ai/insights", { method: "POST" });
      const data = (await res.json()) as {
        summary?: { relPath: string };
        error?: string;
      };
      if (!res.ok || !data.summary) throw new Error(data.error ?? "Failed");
      toast.success(`Insight written to ${data.summary.relPath}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed");
    } finally {
      setInsighting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" onClick={runIndex} disabled={indexing}>
        {indexing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <RefreshCw className="size-4" />
        )}
        {indexing ? "Indexing…" : "Update index"}
      </Button>
      <Button variant="outline" onClick={runInsights} disabled={insighting}>
        {insighting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Sparkles className="size-4" />
        )}
        {insighting ? "Analyzing…" : "Generate weekly insight"}
      </Button>
      {ollamaHint ? (
        <span className="text-xs text-muted-foreground">{ollamaHint}</span>
      ) : null}
    </div>
  );
}
