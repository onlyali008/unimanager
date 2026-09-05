import type { FocusEntry } from "./types";

function dateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export interface FocusStats {
  todayMinutes: number;
  weekMinutes: number;
  streakDays: number;
}

/**
 * Study-focus summary from the dated log.
 * - `weekMinutes` covers the last 7 days including today.
 * - `streakDays` counts consecutive days with focus ending today, with a
 *   one-day grace so an as-yet-unstudied today doesn't reset a live streak.
 */
export function focusStats(
  log: FocusEntry[],
  now: Date = new Date(),
): FocusStats {
  const byDate = new Map(log.map((e) => [e.date, e.minutes]));
  const todayMinutes = byDate.get(dateKey(now)) ?? 0;

  let weekMinutes = 0;
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    weekMinutes += byDate.get(dateKey(d)) ?? 0;
  }

  const cursor = new Date(now);
  if ((byDate.get(dateKey(cursor)) ?? 0) === 0) {
    cursor.setDate(cursor.getDate() - 1); // grace day
  }
  let streakDays = 0;
  while ((byDate.get(dateKey(cursor)) ?? 0) > 0) {
    streakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { todayMinutes, weekMinutes, streakDays };
}
