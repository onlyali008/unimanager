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

export type NoteType = DomainSlug | "daily" | "insight" | "moc";

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
}

export interface WellnessFrontmatter extends BaseFrontmatter {
  type: "wellness";
  date: string;
  /** All 1–5, same scale as sleep quality. */
  mood: number;
  energy: number;
  stress: number;
  symptoms: string[];
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

export interface AcademicsFrontmatter extends BaseFrontmatter {
  type: "academics";
  course: string;
  course_name: string;
  term: string;
  credits: number;
  deadlines: Deadline[];
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
