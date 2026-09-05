"use client";

import Link from "next/link";
import { useTimer, formatClock } from "@/hooks/useTimer";

/** A small floating pill that keeps the running timer visible on every page. */
export function TimerWidget() {
  const timer = useTimer();

  if (!timer.running) return null;

  return (
    <div
      className="timer-widget"
      data-mode={timer.mode}
      role="status"
      aria-label={`${timer.mode === "focus" ? "Focus" : "Break"} timer ${formatClock(
        timer.remainingMs,
      )} remaining`}
    >
      <span className="timer-widget-mode">
        {timer.mode === "focus" ? "Focus" : "Break"}
      </span>
      <span className="timer-widget-clock">
        {formatClock(timer.remainingMs)}
      </span>
      <button
        type="button"
        className="btn-icon"
        onClick={timer.pause}
        aria-label="Pause timer"
      >
        Pause
      </button>
      <Link href="/timer" className="btn-icon" aria-label="Open timer">
        Open
      </Link>
    </div>
  );
}
