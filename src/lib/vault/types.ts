/**
 * Locked frontmatter schemas — one per domain. Every note in a domain
 * folder must carry exactly these fields (see docs/vault-schema.md).
 * Dates are ISO strings ("YYYY-MM-DD"), never YAML date objects, so
 * files round-trip byte-stably through gray-matter.
 */

export type DomainSlug =
  | "nutrition"
  | "fitness"
  | "sleep"
  | "wellness"
  | "academics"
  | "finances";

export type NoteType = DomainSlug | "daily" | "insight" | "moc" | "schedule";

/** Fields shared by every note in the vault. */
export interface BaseFrontmatter {
  type: NoteType;
  /** Freeform cross-domain tags, e.g. ["exam-week", "low-energy"]. */
  tags: string[];
  /** ISO timestamp of first creation. */
  created: string;
}

export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export interface MealEntry {
  name: string;
  meal: MealSlot;
  portion_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  /** USDA FoodData Central id; null when entered manually. */
  fdc_id: number | null;
  source: "fdc" | "manual";
}

export interface NutritionFrontmatter extends BaseFrontmatter {
  type: "nutrition";
  date: string;
  meals: MealEntry[];
  totals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
}

export type WorkoutCategory =
  | "strength"
  | "cardio"
  | "sport"
  | "mobility"
  | "other";

export interface WorkoutEntry {
  activity: string;
  category: WorkoutCategory;
  duration_min: number;
  /** Perceived intensity, 1 (easy) to 5 (max effort). */
  intensity: number;
  calories_burned: number | null;
  /** Added 2026-07-06 (Garmin integration): where this workout came from. */
  source: "manual" | "garmin";
  /** Garmin activity id for sync dedup; null for manual entries. */
  garmin_activity_id: number | null;
}

export interface FitnessFrontmatter extends BaseFrontmatter {
  type: "fitness";
  date: string;
  workouts: WorkoutEntry[];
  totals: {
    duration_min: number;
    sessions: number;
  };
}

export interface SleepFrontmatter extends BaseFrontmatter {
  type: "sleep";
  /** The morning you woke up. */
  date: string;
  bedtime: string;
  wake_time: string;
  duration_h: number;
  /** 1 (terrible) to 5 (fully rested). */
  quality: number;
  interruptions: number;
  naps_min: number;
  /** Added 2026-07-06 (Garmin integration). */
  source: "manual" | "garmin";
  /** Garmin sleep score 0–100; null for manual entries. */
  sleep_score: number | null;
}

/** Objective daily metrics pulled from Garmin; never mixed into the subjective 1–5 fields. */
export interface GarminWellness {
  steps: number | null;
  resting_hr: number | null;
  stress_avg: number | null;
  body_battery_high: number | null;
  body_battery_low: number | null;
}

export interface WellnessFrontmatter extends BaseFrontmatter {
  type: "wellness";
  date: string;
  /** All 1–5, same scale as sleep quality. Null until you check in. */
  mood: number | null;
  energy: number | null;
  stress: number | null;
  symptoms: string[];
  /** Added 2026-07-06 (Garmin integration); null when never synced. */
  garmin: GarminWellness | null;
}

export type DeadlineKind =
  | "assignment"
  | "exam"
  | "quiz"
  | "project"
  | "reading";

export type DeadlineStatus = "todo" | "in_progress" | "done";

export interface Deadline {
  title: string;
  due: string;
  kind: DeadlineKind;
  status: DeadlineStatus;
  weight_pct: number | null;
}

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

/** Added 2026-07-06 (Phase 2): weekly class meeting time. */
export interface CourseMeeting {
  day: Weekday;
  start: string;
  end: string;
  location: string | null;
}

export interface AcademicsFrontmatter extends BaseFrontmatter {
  type: "academics";
  course: string;
  course_name: string;
  term: string;
  credits: number;
  deadlines: Deadline[];
  /** Added 2026-07-06 (Phase 2); older notes without it read as []. */
  meetings: CourseMeeting[];
}

export type TransactionCategory =
  | "food"
  | "transport"
  | "housing"
  | "tuition"
  | "entertainment"
  | "health"
  | "income"
  | "other";

export interface Transaction {
  date: string;
  /** Negative = expense, positive = income. */
  amount: number;
  category: TransactionCategory;
  description: string;
}

export interface FinancesFrontmatter extends BaseFrontmatter {
  type: "finances";
  /** "YYYY-MM" — one note per month. */
  month: string;
  currency: string;
  transactions: Transaction[];
  totals: {
    income: number;
    expenses: number;
    net: number;
  };
}

export interface DailyNoteFrontmatter extends BaseFrontmatter {
  type: "daily";
  date: string;
}

export interface InsightFrontmatter extends BaseFrontmatter {
  type: "insight";
  /** ISO week, e.g. "2026-W28". */
  week: string;
}

export interface MocFrontmatter extends BaseFrontmatter {
  type: "moc";
  domain: DomainSlug;
}

/** A weekly recurring block owned by one of the tracking modules. */
export interface RecurringItem {
  title: string;
  module: "fitness" | "wellness" | "academics" | "other";
  day: Weekday;
  start: string;
  end: string;
}

/** schedule/recurring.md — the single note holding non-course recurring items. */
export interface ScheduleFrontmatter extends BaseFrontmatter {
  type: "schedule";
  items: RecurringItem[];
}
