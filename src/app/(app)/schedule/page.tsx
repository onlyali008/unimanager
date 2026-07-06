import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";

import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata: Metadata = { title: "Schedule" };

export default function SchedulePage() {
  return (
    <PlaceholderPage
      title="Schedule"
      description="A calendar built from what you already track."
      icon={CalendarDays}
      phase="Phase 2"
      upcoming={[
        "Calendar view pulling deadlines from your academics notes",
        "Recurring items from other modules",
        "Basic conflict detection",
      ]}
    />
  );
}
