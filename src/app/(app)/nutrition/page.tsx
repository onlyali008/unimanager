import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/placeholder-page";
import { DOMAINS } from "@/lib/domains";

const domain = DOMAINS.find((d) => d.slug === "nutrition")!;

export const metadata: Metadata = { title: "Nutrition" };

export default function NutritionPage() {
  return (
    <PlaceholderPage
      title={domain.label}
      description={domain.description}
      icon={domain.icon}
      iconClass={domain.textClass}
      phase="Phase 1"
      vaultFolder={domain.vaultFolder}
      upcoming={[
        "Log meals by searching USDA FoodData Central and picking the right match",
        "Calories, protein, carbs, and fat auto-filled and scaled to your portion",
        "Manual entry for foods without a good FDC match",
        "30-day calorie and macro trend chart",
      ]}
    />
  );
}
