"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const GOTO: Record<string, string> = {
  d: "/",
  c: "/courses",
  k: "/calendar",
  t: "/timer",
  p: "/progress",
  a: "/assistant",
  s: "/settings",
};

const HELP = [
  { keys: "?", label: "Show this help" },
  { keys: "g then d", label: "Go to Dashboard" },
  { keys: "g then c", label: "Go to Courses" },
  { keys: "g then k", label: "Go to Calendar" },
  { keys: "g then t", label: "Go to Timer" },
  { keys: "g then p", label: "Go to Progress" },
  { keys: "g then a", label: "Go to Assistant" },
  { keys: "g then s", label: "Go to Settings" },
  { keys: "n", label: "New task (on Dashboard)" },
  { keys: "/", label: "Focus search (on Dashboard)" },
  { keys: "Esc", label: "Close dialogs" },
];

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

export function GlobalShortcuts() {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const awaitingG = useRef(false);
  const gTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (helpOpen && !dialog.open) dialog.showModal();
    if (!helpOpen && dialog.open) dialog.close();
  }, [helpOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      // Don't hijack keys while any modal dialog is open (except our own help).
      const openDialog = document.querySelector("dialog[open]");
      if (openDialog && openDialog !== dialogRef.current) return;

      if (awaitingG.current) {
        awaitingG.current = false;
        if (gTimer.current) clearTimeout(gTimer.current);
        const dest = GOTO[e.key.toLowerCase()];
        if (dest) {
          e.preventDefault();
          router.push(dest);
        }
        return;
      }

      if (e.key === "?") {
        e.preventDefault();
        setHelpOpen((v) => !v);
        return;
      }
      if (e.key.toLowerCase() === "g") {
        awaitingG.current = true;
        if (gTimer.current) clearTimeout(gTimer.current);
        gTimer.current = setTimeout(() => {
          awaitingG.current = false;
        }, 1200);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (gTimer.current) clearTimeout(gTimer.current);
    };
  }, [router]);

  return (
    <dialog
      ref={dialogRef}
      className="semestra-dialog"
      aria-labelledby="shortcuts-title"
      onClose={() => setHelpOpen(false)}
      onCancel={() => setHelpOpen(false)}
    >
      <div className="dialog-body">
        <div className="dialog-header">
          <h2 id="shortcuts-title" className="text-lg font-semibold">
            Keyboard shortcuts
          </h2>
          <button
            type="button"
            className="btn-icon"
            onClick={() => setHelpOpen(false)}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <ul className="shortcut-list">
          {HELP.map((s) => (
            <li key={s.label} className="shortcut-row">
              <kbd className="kbd">{s.keys}</kbd>
              <span>{s.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </dialog>
  );
}
