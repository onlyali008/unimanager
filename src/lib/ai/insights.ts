import { isoWeekOf, lastNDates, todayISO } from "@/lib/vault/dates";
import {
  getCourses,
  getRecentFinances,
  getRecentFitness,
  getRecentNutrition,
  getRecentSleep,
  getRecentWellness,
} from "@/lib/vault/entries";
import { readNote, writeNote } from "@/lib/vault/fs";
import type { InsightFrontmatter } from "@/lib/vault/types";

import { ollamaChat } from "./ollama";

/**
 * Builds a compact per-day digest of the last 7 days across every domain.
 * The model sees structured facts, not raw notes, so it can correlate
 * rather than summarize.
 */
export async function buildWeeklyDigest(): Promise<string> {
  const days = lastNDates(7);
  const [nutrition, fitness, sleep, wellness, finances, courses] =
    await Promise.all([
      getRecentNutrition(7),
      getRecentFitness(7),
      getRecentSleep(7),
      getRecentWellness(7),
      getRecentFinances(7),
      getCourses(),
    ]);

  const byDate = <T>(rows: Array<{ date: string; frontmatter: T }>) =>
    new Map(rows.map((r) => [r.date, r.frontmatter]));
  const nut = byDate(nutrition);
  const fit = byDate(fitness);
  const slp = byDate(sleep);
  const wel = byDate(wellness);

  const lines: string[] = [];
  for (const date of days) {
    const parts: string[] = [];
    const s = slp.get(date);
    if (s) {
      parts.push(
        `sleep ${s.duration_h}h quality ${s.quality}/5${s.sleep_score != null ? ` score ${s.sleep_score}` : ""}`,
      );
    }
    const n = nut.get(date);
    if (n && n.meals.length > 0) {
      parts.push(
        `ate ${n.totals.calories} kcal (protein ${n.totals.protein_g}g)`,
      );
    }
    const f = fit.get(date);
    if (f && f.totals.sessions > 0) {
      parts.push(
        `trained ${f.totals.duration_min}min (${f.workouts.map((w) => w.activity).join(", ")})`,
      );
    }
    const w = wel.get(date);
    if (w && w.mood != null) {
      parts.push(`mood ${w.mood}/5 energy ${w.energy}/5 stress ${w.stress}/5`);
    }
    if (w?.garmin?.steps != null) parts.push(`${w.garmin.steps} steps`);
    if (w && w.symptoms.length > 0) parts.push(`symptoms: ${w.symptoms.join("/")}`);
    lines.push(`${date}: ${parts.length > 0 ? parts.join("; ") : "nothing logged"}`);
  }

  const daySet = new Set(days);
  const spend = finances
    .flatMap((m) => m.transactions)
    .filter((t) => daySet.has(t.date));
  const spent = spend
    .filter((t) => t.amount < 0)
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const byCategory = new Map<string, number>();
  for (const t of spend) {
    if (t.amount < 0) {
      byCategory.set(
        t.category,
        (byCategory.get(t.category) ?? 0) + Math.abs(t.amount),
      );
    }
  }
  lines.push(
    `week spending: ${Math.round(spent * 100) / 100} CAD (${[...byCategory.entries()]
      .map(([c, v]) => `${c} ${Math.round(v)}`)
      .join(", ") || "none"})`,
  );

  const today = todayISO();
  const upcoming = courses
    .flatMap((c) => c.deadlines.map((d) => ({ course: c.course, ...d })))
    .filter((d) => d.status !== "done" && d.due >= today)
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 8);
  lines.push(
    `upcoming deadlines: ${
      upcoming.map((d) => `${d.due} ${d.course} ${d.title} (${d.kind})`).join("; ") ||
      "none"
    }`,
  );

  return lines.join("\n");
}

const INSIGHT_SYSTEM = `You analyze one week of a university student's life-log (sleep, food, training, mood, spending, deadlines). Find 2-4 genuine CROSS-DOMAIN patterns — how one area affected another (e.g. short sleep before deadlines, spending spikes on low-mood days, training vs energy). Rules:
- Every claim must cite the concrete numbers/days from the data.
- Do NOT restate the data or give generic health advice.
- If the data is too sparse for a pattern, say so honestly in one bullet.
- Output: markdown bullet list only, no heading, no preamble.`;

export interface InsightSummary {
  week: string;
  relPath: string;
  written: boolean;
}

/** The weekly job: writes insights/YYYY-Www.md from the last 7 days. */
export async function generateWeeklyInsight(): Promise<InsightSummary> {
  const week = isoWeekOf(todayISO());
  const relPath = `insights/${week}.md`;

  const digest = await buildWeeklyDigest();
  const analysis = (
    await ollamaChat(INSIGHT_SYSTEM, digest, 180_000)
  ).trim();

  const existing = await readNote<InsightFrontmatter>(relPath);
  const frontmatter: InsightFrontmatter = {
    type: "insight",
    week,
    tags: existing?.frontmatter.tags ?? [],
    created: existing?.frontmatter.created ?? new Date().toISOString(),
  };
  const body = `# Week ${week}\n\n${analysis}\n\n## Data digest\n\n\`\`\`\n${digest}\n\`\`\`\n`;
  await writeNote(relPath, { ...frontmatter }, body);

  return { week, relPath, written: true };
}
