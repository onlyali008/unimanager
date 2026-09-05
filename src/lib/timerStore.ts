// A Pomodoro-style study timer kept as a module singleton so it keeps running
// as you move between pages. State is persisted to localStorage (restored
// paused on reload) and block completions raise an audible + visible alert.
// Completed focus blocks log their minutes against the selected task.

import { logTaskMinutes } from "./store";

export type TimerMode = "focus" | "break";

export interface TimerState {
  taskId: string | null;
  mode: TimerMode;
  running: boolean;
  focusMin: number;
  breakMin: number;
  remainingMs: number;
  completedFocus: number;
}

const DEFAULT_FOCUS = 25;
const DEFAULT_BREAK = 5;
const STORAGE_KEY = "semestra.timer";

let state: TimerState = {
  taskId: null,
  mode: "focus",
  running: false,
  focusMin: DEFAULT_FOCUS,
  breakMin: DEFAULT_BREAK,
  remainingMs: DEFAULT_FOCUS * 60_000,
  completedFocus: 0,
};

const SERVER_STATE = state;

let elapsedFocusMs = 0;
let lastTick = 0;
let handle: ReturnType<typeof setInterval> | null = null;
let savedTitle: string | null = null;
const listeners = new Set<() => void>();

// Restore persisted state on the client (always paused, to avoid drift).
if (typeof window !== "undefined") {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<TimerState>;
      state = {
        taskId: typeof p.taskId === "string" ? p.taskId : null,
        mode: p.mode === "break" ? "break" : "focus",
        running: false,
        focusMin: clampMin(p.focusMin, 1, 180, DEFAULT_FOCUS),
        breakMin: clampMin(p.breakMin, 1, 60, DEFAULT_BREAK),
        remainingMs:
          typeof p.remainingMs === "number" && p.remainingMs > 0
            ? p.remainingMs
            : DEFAULT_FOCUS * 60_000,
        completedFocus:
          typeof p.completedFocus === "number" && p.completedFocus >= 0
            ? p.completedFocus
            : 0,
      };
    }
  } catch {
    /* ignore corrupt timer state */
  }
}

function clampMin(
  v: unknown,
  lo: number,
  hi: number,
  fallback: number,
): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        taskId: state.taskId,
        mode: state.mode,
        focusMin: state.focusMin,
        breakMin: state.breakMin,
        remainingMs: state.remainingMs,
        completedFocus: state.completedFocus,
      }),
    );
  } catch {
    /* ignore */
  }
}

function emit(): void {
  for (const l of listeners) l();
}

function set(partial: Partial<TimerState>): void {
  state = { ...state, ...partial };
  persist();
  emit();
}

/* --- Alerts -------------------------------------------------------- */

function ding(): void {
  if (typeof window === "undefined") return;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return;
  try {
    const ctx = new Ctx();
    const beep = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + start + dur,
      );
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    };
    beep(660, 0, 0.18);
    beep(880, 0.2, 0.22);
    setTimeout(() => ctx.close().catch(() => {}), 800);
  } catch {
    /* audio not available */
  }
}

function notify(body: string): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  try {
    if (Notification.permission === "granted") {
      new Notification("Semestra", { body });
    }
  } catch {
    /* ignore */
  }
}

function flashTitle(text: string | null): void {
  if (typeof document === "undefined") return;
  if (text) {
    if (savedTitle === null) savedTitle = document.title;
    document.title = text;
  } else if (savedTitle !== null) {
    document.title = savedTitle;
    savedTitle = null;
  }
}

function requestNotifyPermission(): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  try {
    if (Notification.permission === "default") {
      void Notification.requestPermission();
    }
  } catch {
    /* ignore */
  }
}

/* --- Ticking ------------------------------------------------------- */

function stopInterval(): void {
  if (handle) {
    clearInterval(handle);
    handle = null;
  }
}

function startInterval(): void {
  if (handle) return;
  lastTick = Date.now();
  handle = setInterval(onTick, 250);
}

function onTick(): void {
  const now = Date.now();
  const dt = now - lastTick;
  lastTick = now;
  if (state.mode === "focus") elapsedFocusMs += dt;
  const remaining = state.remainingMs - dt;
  if (remaining <= 0) {
    complete();
  } else {
    set({ remainingMs: remaining });
  }
}

function complete(): void {
  if (state.mode === "focus") {
    if (state.taskId) logTaskMinutes(state.taskId, Math.round(state.focusMin));
    elapsedFocusMs = 0;
    lastTick = Date.now();
    const msg = "Focus block done — take a break.";
    ding();
    notify(msg);
    flashTitle("⏰ Break time — Semestra");
    set({
      mode: "break",
      remainingMs: state.breakMin * 60_000,
      completedFocus: state.completedFocus + 1,
    });
  } else {
    lastTick = Date.now();
    const msg = "Break over — back to focus.";
    ding();
    notify(msg);
    flashTitle("⏰ Focus time — Semestra");
    set({ mode: "focus", remainingMs: state.focusMin * 60_000 });
  }
}

/* --- Public API ---------------------------------------------------- */

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): TimerState {
  return state;
}

export function getServerSnapshot(): TimerState {
  return SERVER_STATE;
}

export function start(): void {
  if (state.running) return;
  flashTitle(null);
  requestNotifyPermission();
  startInterval();
  set({ running: true });
}

export function pause(): void {
  if (!state.running) return;
  stopInterval();
  set({ running: false });
}

export function toggle(): void {
  if (state.running) pause();
  else start();
}

export function reset(): void {
  stopInterval();
  elapsedFocusMs = 0;
  flashTitle(null);
  set({
    running: false,
    mode: "focus",
    remainingMs: state.focusMin * 60_000,
  });
}

/** Log the minutes focused so far in the current block, then reset. */
export function logAndReset(): void {
  const minutes = Math.round(elapsedFocusMs / 60_000);
  if (state.taskId && minutes > 0) logTaskMinutes(state.taskId, minutes);
  reset();
}

export function skip(): void {
  flashTitle(null);
  if (state.mode === "focus") {
    const minutes = Math.round(elapsedFocusMs / 60_000);
    if (state.taskId && minutes > 0) logTaskMinutes(state.taskId, minutes);
    elapsedFocusMs = 0;
    lastTick = Date.now();
    set({ mode: "break", remainingMs: state.breakMin * 60_000 });
  } else {
    lastTick = Date.now();
    set({ mode: "focus", remainingMs: state.focusMin * 60_000 });
  }
}

export function selectTask(taskId: string | null): void {
  set({ taskId });
}

export function setDurations(focusMin: number, breakMin: number): void {
  const f = Math.max(1, Math.min(180, Math.round(focusMin)));
  const b = Math.max(1, Math.min(60, Math.round(breakMin)));
  const patch: Partial<TimerState> = { focusMin: f, breakMin: b };
  if (!state.running) {
    patch.remainingMs = (state.mode === "focus" ? f : b) * 60_000;
  }
  set(patch);
}
