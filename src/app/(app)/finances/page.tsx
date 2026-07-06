import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/placeholder-page";
import { DOMAINS } from "@/lib/domains";

const domain = DOMAINS.find((d) => d.slug === "finances")!;

export const metadata: Metadata = { title: "Finances" };

export default function FinancesPage() {
  return (
    <PlaceholderPage
      title={domain.label}
      description={domain.description}
      icon={domain.icon}
      iconClass={domain.textClass}
      phase="Phase 1"
      vaultFolder={domain.vaultFolder}
      upcoming={[
        "Log transactions with amount, category, and description (CAD)",
        "One monthly note per YYYY-MM with running totals",
        "30-day spending by category chart",
      ]}
    />
  );
}
