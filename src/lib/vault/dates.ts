/** Local-timezone date helpers. All vault dates are "YYYY-MM-DD" strings. */

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function monthOf(dateISO: string): string {
  return dateISO.slice(0, 7);
}

/** The last `n` dates ending today, oldest first. */
export function lastNDates(n: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    dates.push(toISODate(d));
  }
  return dates;
}

/** Distinct months covering the last `n` days, oldest first. */
export function monthsCoveringLastNDays(n: number): string[] {
  const months = new Set<string>(lastNDates(n).map(monthOf));
  return [...months].sort();
}

/** ISO week id for a date, e.g. "2026-W28". */
export function isoWeekOf(dateISO: string): string {
  const d = new Date(`${dateISO}T12:00:00Z`);
  // Shift to the Thursday of this week — its year is the ISO year.
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const isoYear = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}
