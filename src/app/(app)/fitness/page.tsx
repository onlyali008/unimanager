import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/placeholder-page";
import { DOMAINS } from "@/lib/domains";

const domain = DOMAINS.find((d) => d.slug === "fitness")!;

export const metadata: Metadata = { title: "Fitness" };

export default function FitnessPage() {
  return (
    <PlaceholderPage
      title={domain.label}
      description={domain.description}
      icon={domain.icon}
      iconClass={domain.textClass}
      phase="Phase 1"
      vaultFolder={domain.vaultFolder}
      upcoming={[
        "Log workouts with activity, category, duration, and intensity",
        "Recent sessions list from your vault",
        "30-day training volume trend chart",
      ]}
    />
  );
}
