"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, RefreshCw, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

import type { ModelOption } from "@/lib/ai/providers";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

const MODEL_STORAGE_KEY = "semestra:chat-model";

const STARTERS = [
  "How did I sleep during exam weeks?",
  "Where did my money go this month?",
  "What should I focus on this week?",
];

export function AssistantChat({
  models,
  defaultModel,
  anyConfigured,
}: {
  models: ModelOption[];
  defaultModel: string;
  anyConfigured: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [model, setModel] = useState(defaultModel);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Restore a previously-chosen model if it's still available. Runs after
  // hydration on purpose — reading localStorage during render would mismatch
  // the server-rendered default.
  useEffect(() => {
    const saved = localStorage.getItem(MODEL_STORAGE_KEY);
    if (saved && models.some((m) => m.id === saved && m.configured)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setModel(saved);
    }
  }, [models]);

  function chooseModel(id: string) {
    setModel(id);
    localStorage.setItem(MODEL_STORAGE_KEY, id);
  }

  const selected = models.find((m) => m.id === model);

  // Group models by provider, preserving registry order.
  const groups = useMemo(() => {
    const order: string[] = [];
    const byProvider = new Map<string, ModelOption[]>();
    for (const m of models) {
      if (!byProvider.has(m.provider)) {
        byProvider.set(m.provider, []);
        order.push(m.provider);
      }
      byProvider.get(m.provider)!.push(m);
    }
    return order.map((p) => ({
      provider: p,
      label: byProvider.get(p)![0].providerLabel,
      items: byProvider.get(p)!,
    }));
  }, [models]);

  function scrollDown() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    });
  }

  async function send(text?: string) {
    const question = (text ?? input).trim();
    if (!question || busy) return;
    if (!selected?.configured) {
      toast.info(
        `Add ${selected?.envKey ?? "an API key"} to .env.local and restart to use ${selected?.label ?? "this model"}.`,
      );
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
          model,
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

      setMessages((prev) => [...prev, { role: "assistant", content: "", sources }]);

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
    <div className="flex h-[62vh] flex-col overflow-hidden rounded-[18px] border border-border bg-card shadow-sm">
      {/* Header — Sem's identity + model picker */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="font-heading text-sm font-bold tracking-tight">Sem</p>
          <p className="truncate text-xs text-muted-foreground">
            Your study companion, grounded in your vault
          </p>
        </div>
        <Select value={model} onValueChange={chooseModel}>
          <SelectTrigger
            size="sm"
            className="w-[9.5rem] rounded-full font-mono text-xs"
            aria-label="Choose model"
          >
            <SelectValue placeholder="Model">
              {selected?.label ?? "Model"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-80">
            {groups.map((g) => (
              <SelectGroup key={g.provider}>
                <SelectLabel className="flex items-center gap-1.5">
                  {g.label}
                  {!g.items[0].configured ? (
                    <span className="font-mono text-[0.6rem] font-normal tracking-wide text-muted-foreground/70">
                      · add {g.items[0].envKey}
                    </span>
                  ) : null}
                </SelectLabel>
                {g.items.map((m) => (
                  <SelectItem
                    key={m.id}
                    value={m.id}
                    disabled={!m.configured}
                    className="text-sm"
                  >
                    {m.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Conversation */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-foreground">
              <Sparkles className="size-6 text-[color-mix(in_oklch,var(--primary),var(--foreground)_35%)]" />
            </span>
            <div className="space-y-1">
              <p className="font-heading text-base font-bold">Hi, I&rsquo;m Sem.</p>
              <p className="mx-auto max-w-xs text-sm text-muted-foreground">
                Ask me anything about your own data — I read your logs and cite
                the notes I used.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  disabled={!anyConfigured}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
            {!anyConfigured ? (
              <p className="max-w-xs font-mono text-[0.7rem] leading-relaxed text-muted-foreground/80">
                No API keys yet. Add one to{" "}
                <code className="text-foreground">.env.local</code> and restart —
                see the model list for key names.
              </p>
            ) : null}
          </div>
        ) : (
          messages.map((m, i) => <Bubble key={i} message={m} />)
        )}
      </div>

      {/* Composer */}
      <form
        className="flex items-end gap-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <Textarea
          rows={1}
          placeholder="Ask Sem about your week…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          className="max-h-32 min-h-[2.75rem] resize-none rounded-[14px]"
        />
        <Button
          type="submit"
          size="icon"
          disabled={busy}
          aria-label="Send"
          className="size-11 shrink-0 rounded-full"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </form>
    </div>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-2.5", isUser && "flex-row-reverse")}>
      {!isUser ? (
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="size-3.5" />
        </span>
      ) : null}
      <div className={cn("max-w-[82%] space-y-2", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-[14px] px-3.5 py-2.5 text-sm whitespace-pre-wrap",
            isUser
              ? "rounded-tr-sm bg-foreground text-background"
              : "rounded-tl-sm border border-border bg-background text-foreground",
          )}
        >
          {message.content || <TypingDots />}
        </div>
        {!isUser && message.sources && message.sources.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {message.sources.slice(0, 5).map((s) => (
              <span
                key={s}
                className="rounded-full border border-border bg-muted px-2 py-0.5 font-mono text-[0.65rem] text-muted-foreground"
              >
                {s.replace(/\.md$/, "")}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-1" aria-label="Sem is typing">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
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
