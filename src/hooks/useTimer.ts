"use client";

import { useSyncExternalStore } from "react";
import * as timer from "@/lib/timerStore";
import type { TimerState } from "@/lib/timerStore";

export interface UseTimer extends TimerState {
  start: () => void;
  pause: () => void;
  toggle: () => void;
  reset: () => void;
  logAndReset: () => void;
  skip: () => void;
  selectTask: (taskId: string | null) => void;
  setDurations: (focusMin: number, breakMin: number) => void;
}

export function useTimer(): UseTimer {
  const state = useSyncExternalStore(
    timer.subscribe,
    timer.getSnapshot,
    timer.getServerSnapshot,
  );
  return {
    ...state,
    start: timer.start,
    pause: timer.pause,
    toggle: timer.toggle,
    reset: timer.reset,
    logAndReset: timer.logAndReset,
    skip: timer.skip,
    selectTask: timer.selectTask,
    setDurations: timer.setDurations,
  };
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
