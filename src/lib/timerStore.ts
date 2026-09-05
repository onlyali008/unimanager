// A Pomodoro-style study timer kept as a module singleton so it keeps running
// as you move between pages (client-side navigation doesn't reload modules).
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
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

function set(partial: Partial<TimerState>): void {
  state = { ...state, ...partial };
  emit();
}

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
    set({
      mode: "break",
      remainingMs: state.breakMin * 60_000,
      completedFocus: state.completedFocus + 1,
    });
  } else {
    lastTick = Date.now();
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
  // If idle, reflect the new length on the clock immediately.
  if (!state.running) {
    patch.remainingMs = (state.mode === "focus" ? f : b) * 60_000;
  }
  set(patch);
}
