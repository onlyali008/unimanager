import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/placeholder-page";
import { DOMAINS } from "@/lib/domains";

const domain = DOMAINS.find((d) => d.slug === "sleep")!;

export const metadata: Metadata = { title: "Sleep" };

export default function SleepPage() {
  return (
    <PlaceholderPage
      title={domain.label}
      description={domain.description}
      icon={domain.icon}
      iconClass={domain.textClass}
      phase="Phase 1"
      vaultFolder={domain.vaultFolder}
      upcoming={[
        "Log bedtime, wake time, quality, and interruptions",
        "Duration computed for you",
        "30-day sleep duration and quality trend chart",
      ]}
    />
  );
}
