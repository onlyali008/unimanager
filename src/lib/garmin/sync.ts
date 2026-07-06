import type { GarminConnect } from "garmin-connect";

import { lastNDates } from "@/lib/vault/dates";
import {
  addWorkout,
  mergeWellnessGarmin,
  setSleep,
} from "@/lib/vault/entries";
import type { GarminWellness, WorkoutCategory } from "@/lib/vault/types";

import { getVerifiedGarminClient } from "./client";

export interface GarminSyncSummary {
  days: number;
  workoutsAdded: number;
  sleepNightsWritten: number;
  wellnessDaysUpdated: number;
  errors: string[];
}

const CATEGORY_RULES: Array<[RegExp, WorkoutCategory]> = [
  [/strength|hiit|crossfit|indoor_cardio/, "strength"],
  [/yoga|pilates|stretch|breathwork|mobility/, "mobility"],
  [
    /running|cycling|swimming|walking|hiking|elliptical|rowing|cardio|skating|skiing/,
    "cardio",
  ],
  [/soccer|basketball|tennis|badminton|volleyball|hockey|golf|squash|padel/, "sport"],
];

function categoryFor(typeKey: string): WorkoutCategory {
  for (const [pattern, category] of CATEGORY_RULES) {
    if (pattern.test(typeKey)) return category;
  }
  return "other";
}

/** Rough perceived-intensity estimate from average session heart rate. */
function intensityFor(averageHR: number | null): number {
  if (averageHR === null) return 3;
  if (averageHR < 100) return 1;
  if (averageHR < 120) return 2;
  if (averageHR < 140) return 3;
  if (averageHR < 160) return 4;
  return 5;
}

/** Garmin "local" epoch timestamps are pre-shifted — format them as UTC. */
function clockFromLocalTimestamp(ms: number): string {
  return new Date(ms).toISOString().slice(11, 16);
}

function toNoonDate(dateISO: string): Date {
  return new Date(`${dateISO}T12:00:00`);
}

async function syncActivities(
  client: GarminConnect,
  dates: Set<string>,
  summary: GarminSyncSummary,
): Promise<void> {
  const activities = await client.getActivities(0, 100);
  for (const activity of activities) {
    const date = activity.startTimeLocal?.slice(0, 10);
    if (!date || !dates.has(date)) continue;
    const extra = activity as unknown as {
      averageHR?: number;
      calories?: number;
    };
    const added = await addWorkout(date, {
      activity: activity.activityName || activity.activityType.typeKey,
      category: categoryFor(activity.activityType.typeKey),
      duration_min: Math.max(1, Math.round((activity.duration ?? 0) / 60)),
      intensity: intensityFor(extra.averageHR ?? null),
      calories_burned:
        typeof extra.calories === "number" ? Math.round(extra.calories) : null,
      source: "garmin",
      garmin_activity_id: activity.activityId,
    });
    if (added) summary.workoutsAdded += 1;
  }
}

async function syncSleep(
  client: GarminConnect,
  date: string,
  summary: GarminSyncSummary,
): Promise<number | null> {
  const data = await client.getSleepData(toNoonDate(date));
  const dto = data?.dailySleepDTO;
  if (!dto || !dto.sleepTimeSeconds || dto.sleepTimeSeconds <= 0) {
    return data?.dailySleepDTO?.id ? null : null;
  }

  const score = dto.sleepScores?.overall?.value ?? null;
  const quality =
    score === null ? 3 : Math.min(5, Math.max(1, Math.ceil(score / 20)));

  const written = await setSleep(date, {
    bedtime: clockFromLocalTimestamp(dto.sleepStartTimestampLocal),
    wake_time: clockFromLocalTimestamp(dto.sleepEndTimestampLocal),
    duration_h: Math.round((dto.sleepTimeSeconds / 3600) * 10) / 10,
    quality,
    interruptions: dto.awakeCount ?? 0,
    naps_min: Math.round((dto.napTimeSeconds ?? 0) / 60),
    source: "garmin",
    sleep_score: score,
  });
  if (written) summary.sleepNightsWritten += 1;

  return typeof data.restingHeartRate === "number"
    ? data.restingHeartRate
    : null;
}

interface DailySummary {
  totalSteps?: number;
  restingHeartRate?: number;
  averageStressLevel?: number;
  bodyBatteryHighestValue?: number;
  bodyBatteryLowestValue?: number;
}

async function fetchDailySummary(
  client: GarminConnect,
  displayName: string | null,
  date: string,
): Promise<DailySummary | null> {
  if (!displayName) return null;
  try {
    return await client.get<DailySummary>(
      `https://connectapi.garmin.com/usersummary-service/usersummary/daily/${displayName}?calendarDate=${date}`,
    );
  } catch {
    return null;
  }
}

function positiveOrNull(value: number | undefined | null): number | null {
  return typeof value === "number" && value >= 0 ? value : null;
}

async function syncWellness(
  client: GarminConnect,
  displayName: string | null,
  date: string,
  restingHrFromSleep: number | null,
  summary: GarminSyncSummary,
): Promise<void> {
  const daily = await fetchDailySummary(client, displayName, date);

  let steps = positiveOrNull(daily?.totalSteps);
  if (steps === null) {
    try {
      steps = positiveOrNull(await client.getSteps(toNoonDate(date)));
    } catch {
      steps = null;
    }
  }

  const garmin: GarminWellness = {
    steps,
    resting_hr:
      positiveOrNull(daily?.restingHeartRate) ?? restingHrFromSleep,
    stress_avg: positiveOrNull(daily?.averageStressLevel),
    body_battery_high: positiveOrNull(daily?.bodyBatteryHighestValue),
    body_battery_low: positiveOrNull(daily?.bodyBatteryLowestValue),
  };

  if (Object.values(garmin).every((v) => v === null)) return;

  await mergeWellnessGarmin(date, garmin);
  summary.wellnessDaysUpdated += 1;
}

/** Pulls the last `days` days from Garmin into the vault. */
export async function syncGarmin(days: number): Promise<GarminSyncSummary> {
  const summary: GarminSyncSummary = {
    days,
    workoutsAdded: 0,
    sleepNightsWritten: 0,
    wellnessDaysUpdated: 0,
    errors: [],
  };

  const { client, displayName } = await getVerifiedGarminClient();
  const dates = lastNDates(days);

  try {
    await syncActivities(client, new Set(dates), summary);
  } catch (error) {
    summary.errors.push(
      `activities: ${error instanceof Error ? error.message : "failed"}`,
    );
  }

  for (const date of dates) {
    let restingHr: number | null = null;
    try {
      restingHr = await syncSleep(client, date, summary);
    } catch (error) {
      summary.errors.push(
        `sleep ${date}: ${error instanceof Error ? error.message : "failed"}`,
      );
    }
    try {
      await syncWellness(client, displayName, date, restingHr, summary);
    } catch (error) {
      summary.errors.push(
        `wellness ${date}: ${error instanceof Error ? error.message : "failed"}`,
      );
    }
  }

  return summary;
}
