"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useStore } from "@/hooks/useStore";
import { coursesInTerm, newId, tasksInTerm } from "@/lib/tasks";
import {
  ASSISTANT_SYSTEM_PROMPT,
  buildScheduleContext,
  listOllamaModels,
  localAnswer,
  streamOllamaChat,
  type ChatMessage,
} from "@/lib/assistant";

const FALLBACK_GUIDANCE =
  'I can answer questions about your schedule — try "what\'s due this week", ' +
  '"anything overdue", "when\'s my next exam", or "what should I work on". ' +
  "For open-ended chat, connect a local Ollama model in Settings.";

interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const STARTERS = [
  "What's due this week?",
  "What should I work on today?",
  "When is my next exam?",
  "Help me plan study time for my open tasks.",
];

export default function AssistantPage() {
  const { tasks, courses, terms, settings, ready } = useStore();
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [srAnnounce, setSrAnnounce] = useState("");
  const [avail, setAvail] = useState<"unknown" | "online" | "offline">(
    "unknown",
  );
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  // Probe the local model without blocking use; sets online/offline async.
  useEffect(() => {
    let cancelled = false;
    listOllamaModels(settings.ollamaUrl)
      .then(() => {
        if (!cancelled) setAvail("online");
      })
      .catch(() => {
        if (!cancelled) setAvail("offline");
      });
    return () => {
      cancelled = true;
    };
  }, [settings.ollamaUrl, settings.ollamaModel]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    setError(null);

    // No local model connected: answer from the schedule deterministically.
    if (avail !== "online") {
      const ans =
        localAnswer(
          trimmed,
          tasksInTerm(tasks, settings.currentTermId),
          coursesInTerm(courses, settings.currentTermId),
        ) ?? FALLBACK_GUIDANCE;
      setMessages((m) => [
        ...m,
        { id: newId(), role: "user", content: trimmed },
        { id: newId(), role: "assistant", content: ans },
      ]);
      setInput("");
      setSrAnnounce(ans);
      return;
    }

    const userMsg: UiMessage = { id: newId(), role: "user", content: trimmed };
    const assistantId = newId();
    const history = messages;
    setMessages((m) => [
      ...m,
      userMsg,
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setInput("");
    setStreaming(true);

    const term = terms.find((t) => t.id === settings.currentTermId);
    const context = buildScheduleContext(
      tasksInTerm(tasks, settings.currentTermId),
      coursesInTerm(courses, settings.currentTermId),
      term,
    );

    const chatMessages: ChatMessage[] = [
      {
        role: "system",
        content: `${ASSISTANT_SYSTEM_PROMPT}\n\nSchedule context:\n${context}`,
      },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: trimmed },
    ];

    const controller = new AbortController();
    abortRef.current = controller;

    let full = "";
    try {
      await streamOllamaChat({
        baseUrl: settings.ollamaUrl,
        model: settings.ollamaModel,
        messages: chatMessages,
        signal: controller.signal,
        onToken: (tok) => {
          full += tok;
          setMessages((m) =>
            m.map((msg) =>
              msg.id === assistantId
                ? { ...msg, content: msg.content + tok }
                : msg,
            ),
          );
        },
      });
      // Announce the finished reply once (not token-by-token).
      if (full.trim()) setSrAnnounce(full);
    } catch (e) {
      const aborted =
        controller.signal.aborted ||
        (e instanceof DOMException && e.name === "AbortError");
      if (!aborted) {
        const message =
          e instanceof Error ? e.message : "Something went wrong.";
        setError(message);
      }
      // Drop the empty assistant bubble if nothing streamed.
      setMessages((m) =>
        m.filter((msg) => !(msg.id === assistantId && msg.content === "")),
      );
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  return (
    <div className="page assistant-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Assistant</p>
          <h1 className="page-title">Ask about your schedule</h1>
          <p className="page-subtitle">
            {avail === "online" ? (
              <>
                Connected to your local model{" "}
                <code>{settings.ollamaModel}</code>. Nothing leaves your
                machine.
              </>
            ) : (
              <>
                Answering from your schedule on this device. Connect a local
                Ollama model in Settings for open-ended chat.
              </>
            )}
          </p>
        </div>
      </header>

      {!ready ? (
        <p className="muted-note">Loading…</p>
      ) : (
        <div className="chat">
          <div className="sr-only" aria-live="polite">
            {srAnnounce}
          </div>
          <div className="chat-log" aria-live="off">
            {messages.length === 0 ? (
              <div className="chat-empty">
                <p className="muted-note">
                  Try one of these, or ask your own question:
                </p>
                <div className="starter-chips">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="chip-btn"
                      onClick={() => send(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`bubble ${m.role}`}>
                  {m.content || (
                    <span className="typing" aria-label="Thinking">
                      <span />
                      <span />
                      <span />
                    </span>
                  )}
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>

          {error && (
            <div className="chat-error" role="alert">
              <p>{error}</p>
              <p className="muted-note">
                Start Ollama and allow this app to reach it:
                <br />
                <code>
                  OLLAMA_ORIGINS=http://localhost:3000 ollama serve
                </code>
                <br />
                then pull the model with{" "}
                <code>ollama pull {settings.ollamaModel}</code>. You can change
                the URL and model in{" "}
                <Link href="/settings" className="course-name-link">
                  Settings
                </Link>
                .
              </p>
            </div>
          )}

          <form
            className="chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              className="field-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about deadlines, courses, or planning…"
              aria-label="Message"
              disabled={streaming}
            />
            {streaming ? (
              <button type="button" className="btn btn-ghost" onClick={stop}>
                Stop
              </button>
            ) : (
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!input.trim()}
              >
                Send
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
