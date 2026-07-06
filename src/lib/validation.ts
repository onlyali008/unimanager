import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const clock = z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM");
const scale5 = z.number().int().min(1).max(5);

export const mealPayload = z.object({
  date: isoDate,
  meal: z.object({
    name: z.string().min(1).max(200),
    meal: z.enum(["breakfast", "lunch", "dinner", "snack"]),
    portion_g: z.number().positive().max(5000),
    calories: z.number().min(0).max(20000),
    protein_g: z.number().min(0).max(2000),
    carbs_g: z.number().min(0).max(2000),
    fat_g: z.number().min(0).max(2000),
    fdc_id: z.number().int().positive().nullable(),
    source: z.enum(["fdc", "manual"]),
  }),
});

export const workoutPayload = z.object({
  date: isoDate,
  workout: z.object({
    activity: z.string().min(1).max(200),
    category: z.enum(["strength", "cardio", "sport", "mobility", "other"]),
    duration_min: z.number().positive().max(1440),
    intensity: scale5,
    calories_burned: z.number().min(0).max(20000).nullable(),
  }),
});

export const sleepPayload = z.object({
  date: isoDate,
  bedtime: clock,
  wake_time: clock,
  duration_h: z.number().min(0).max(24),
  quality: scale5,
  interruptions: z.number().int().min(0).max(50),
  naps_min: z.number().int().min(0).max(720),
});

export const wellnessPayload = z.object({
  date: isoDate,
  mood: scale5,
  energy: scale5,
  stress: scale5,
  symptoms: z.array(z.string().min(1).max(60)).max(20),
  notes: z.string().max(5000).optional(),
});

export const transactionPayload = z.object({
  date: isoDate,
  amount: z
    .number()
    .refine((n) => n !== 0, "Amount can't be zero")
    .refine((n) => Math.abs(n) <= 1_000_000, "Amount too large"),
  category: z.enum([
    "food",
    "transport",
    "housing",
    "tuition",
    "entertainment",
    "health",
    "income",
    "other",
  ]),
  description: z.string().min(1).max(200),
});

const weekday = z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);

const blockIndex = z.number().int().min(0).max(500);

export const schedulePayload = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("meeting"),
    course: z.string().min(1).max(60),
    day: weekday,
    start: clock,
    end: clock,
    location: z.string().max(120).nullable(),
  }),
  z.object({
    action: z.literal("recurring"),
    title: z.string().min(1).max(120),
    module: z.enum(["fitness", "wellness", "academics", "other"]),
    day: weekday,
    start: clock,
    end: clock,
  }),
  z.object({
    action: z.literal("update-meeting"),
    course: z.string().min(1).max(60),
    index: blockIndex,
    day: weekday,
    start: clock,
    end: clock,
    location: z.string().max(120).nullable(),
  }),
  z.object({
    action: z.literal("delete-meeting"),
    course: z.string().min(1).max(60),
    index: blockIndex,
  }),
  z.object({
    action: z.literal("update-recurring"),
    index: blockIndex,
    title: z.string().min(1).max(120),
    module: z.enum(["fitness", "wellness", "academics", "other"]),
    day: weekday,
    start: clock,
    end: clock,
  }),
  z.object({
    action: z.literal("delete-recurring"),
    index: blockIndex,
  }),
]);

export const academicsPayload = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("course"),
    course: z.string().min(1).max(60),
    course_name: z.string().min(1).max(200),
    term: z.string().min(1).max(40),
    credits: z.number().min(0).max(30),
  }),
  z.object({
    action: z.literal("deadline"),
    course: z.string().min(1).max(60),
    title: z.string().min(1).max(200),
    due: isoDate,
    kind: z.enum(["assignment", "exam", "quiz", "project", "reading"]),
    status: z.enum(["todo", "in_progress", "done"]),
    weight_pct: z.number().min(0).max(100).nullable(),
  }),
]);
