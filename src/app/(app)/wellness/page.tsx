import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/placeholder-page";
import { DOMAINS } from "@/lib/domains";

const domain = DOMAINS.find((d) => d.slug === "wellness")!;

export const metadata: Metadata = { title: "Wellness" };

export default function WellnessPage() {
  return (
    <PlaceholderPage
      title={domain.label}
      description={domain.description}
      icon={domain.icon}
      iconClass={domain.textClass}
      phase="Phase 1"
      vaultFolder={domain.vaultFolder}
      upcoming={[
        "Daily mood, energy, and stress check-ins on a 1–5 scale",
        "Symptoms and freeform reflection",
        "30-day mood and energy trend chart",
      ]}
    />
  );
}
