"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/hooks/useStore";

const LEAD_MS = 30 * 60 * 1000; // notify within 30 minutes of a deadline
const STORAGE_KEY = "semestra.notified";
const MAX_REMEMBERED = 300;

/**
 * While the app is open, fires a browser notification for tasks coming due
 * within the lead window. Renders nothing. Notifications only fire when the
 * user has enabled reminders (Settings) and granted permission. Each
 * task+dueDate is notified at most once (persisted), so rescheduling re-arms it.
 */
export function DeadlineReminders() {
  const { tasks, settings } = useStore();
  const dataRef = useRef({ tasks, settings });
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    dataRef.current = { tasks, settings };
  }, [tasks, settings]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) notifiedRef.current = new Set(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    function persist() {
      try {
        const arr = [...notifiedRef.current].slice(-MAX_REMEMBERED);
        notifiedRef.current = new Set(arr);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
      } catch {
        /* ignore */
      }
    }

    function check() {
      const { tasks: current, settings: s } = dataRef.current;
      if (!s.remindersEnabled) return;
      if (typeof Notification === "undefined" || Notification.permission !== "granted") {
        return;
      }
      const now = Date.now();
      let changed = false;
      for (const t of current) {
        if (t.completed || !t.dueAt) continue;
        const due = new Date(t.dueAt).getTime();
        if (Number.isNaN(due)) continue;
        const key = `${t.id}:${t.dueAt}`;
        if (notifiedRef.current.has(key)) continue;
        if (due > now && due - now <= LEAD_MS) {
          const mins = Math.max(1, Math.round((due - now) / 60000));
          try {
            new Notification("Semestra — due soon", {
              body: `${t.title} is due in ${mins} min`,
            });
          } catch {
            /* ignore */
          }
          notifiedRef.current.add(key);
          changed = true;
        }
      }
      if (changed) persist();
    }

    check();
    const handle = setInterval(check, 60_000);
    return () => clearInterval(handle);
  }, []);

  return null;
}
