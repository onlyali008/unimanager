import { describe, it, expect } from "vitest";
import type { FocusEntry } from "./types";
import { focusStats } from "./focus";

const NOW = new Date("2026-09-05T12:00:00");

function key(offset: number): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() + offset);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

describe("focusStats", () => {
  it("sums today and the last 7 days", () => {
    const log: FocusEntry[] = [
      { date: key(0), minutes: 30 },
      { date: key(-1), minutes: 25 },
      { date: key(-6), minutes: 10 },
      { date: key(-8), minutes: 100 }, // outside the week window
    ];
    const s = focusStats(log, NOW);
    expect(s.todayMinutes).toBe(30);
    expect(s.weekMinutes).toBe(65);
  });

  it("counts a consecutive streak ending today", () => {
    const log: FocusEntry[] = [
      { date: key(0), minutes: 10 },
      { date: key(-1), minutes: 10 },
      { date: key(-2), minutes: 10 },
      { date: key(-4), minutes: 10 }, // gap at -3 breaks it
    ];
    expect(focusStats(log, NOW).streakDays).toBe(3);
  });

  it("keeps a live streak through an unstudied today (grace)", () => {
    const log: FocusEntry[] = [
      { date: key(-1), minutes: 20 },
      { date: key(-2), minutes: 20 },
    ];
    expect(focusStats(log, NOW).streakDays).toBe(2);
  });

  it("is zero with no focus", () => {
    expect(focusStats([], NOW)).toEqual({
      todayMinutes: 0,
      weekMinutes: 0,
      streakDays: 0,
    });
  });
});
