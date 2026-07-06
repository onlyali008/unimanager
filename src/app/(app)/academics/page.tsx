import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/placeholder-page";
import { DOMAINS } from "@/lib/domains";

const domain = DOMAINS.find((d) => d.slug === "academics")!;

export const metadata: Metadata = { title: "Academics" };

export default function AcademicsPage() {
  return (
    <PlaceholderPage
      title={domain.label}
      description={domain.description}
      icon={domain.icon}
      iconClass={domain.textClass}
      phase="Phase 1"
      vaultFolder={domain.vaultFolder}
      upcoming={[
        "One note per course with notes and deadlines",
        "Add assignments, exams, quizzes, and projects with due dates",
        "Upcoming deadlines across all courses",
      ]}
    />
  );
}
