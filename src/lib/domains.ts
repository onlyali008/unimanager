import {
  Apple,
  Dumbbell,
  GraduationCap,
  HeartPulse,
  MoonStar,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { DomainSlug } from "@/lib/vault/types";

/**
 * UI registry for the six tracked domains. Color classes map to the
 * domain tokens in globals.css so every surface (sidebar, cards,
 * charts) speaks the same color language.
 */
export interface DomainMeta {
  slug: DomainSlug;
  label: string;
  icon: LucideIcon;
  textClass: string;
  bgClass: string;
  vaultFolder: string;
  description: string;
}

export const DOMAINS: DomainMeta[] = [
  {
    slug: "nutrition",
    label: "Nutrition",
    icon: Apple,
    textClass: "text-nutrition",
    bgClass: "bg-nutrition",
    vaultFolder: "nutrition/YYYY-MM-DD.md",
    description: "Meals with calories and macros, auto-filled from USDA FoodData Central.",
  },
  {
    slug: "fitness",
    label: "Fitness",
    icon: Dumbbell,
    textClass: "text-fitness",
    bgClass: "bg-fitness",
    vaultFolder: "fitness/YYYY-MM-DD.md",
    description: "Workouts with type, duration, and intensity.",
  },
  {
    slug: "sleep",
    label: "Sleep",
    icon: MoonStar,
    textClass: "text-sleep",
    bgClass: "bg-sleep",
    vaultFolder: "sleep/YYYY-MM-DD.md",
    description: "Bedtime, wake time, duration, and sleep quality.",
  },
  {
    slug: "wellness",
    label: "Wellness",
    icon: HeartPulse,
    textClass: "text-wellness",
    bgClass: "bg-wellness",
    vaultFolder: "wellness/YYYY-MM-DD.md",
    description: "Mood, energy, and stress check-ins with a daily reflection.",
  },
  {
    slug: "academics",
    label: "Academics",
    icon: GraduationCap,
    textClass: "text-academics",
    bgClass: "bg-academics",
    vaultFolder: "academics/{course}/notes-and-deadlines.md",
    description: "Courses, notes, and assignment or exam deadlines.",
  },
  {
    slug: "finances",
    label: "Finances",
    icon: Wallet,
    textClass: "text-finances",
    bgClass: "bg-finances",
    vaultFolder: "finances/YYYY-MM.md",
    description: "Monthly transactions by category, income vs. spending.",
  },
];
