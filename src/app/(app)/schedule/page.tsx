import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";

import { ScheduleEntryButtons } from "@/components/forms/schedule-forms";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  addMonths,
  buildWeeklyBlocks,
  findBlockConflicts,
  findDeadlinePileUps,
  monthGrid,
  monthLabel,
  WEEKDAY_LABELS,
  WEEKDAYS,
  type DatedDeadline,
  type WeeklyBlock,
} from "@/lib/schedule";
import { monthOf, todayISO } from "@/lib/vault/dates";
import { getCourses, getRecurringItems } from "@/lib/vault/entries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Schedule" };
export const dynamic = "force-dynamic";

const MODULE_CLASSES: Record<WeeklyBlock["module"], string> = {
  academics: "bg-academics/10 text-academics",
  fitness: "bg-fitness/10 text-fitness",
  wellness: "bg-wellness/10 text-wellness",
  other: "bg-muted text-muted-foreground",
};

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const today = todayISO();
  const month = /^\d{4}-\d{2}$/.test(params.month ?? "")
    ? (params.month as string)
    : monthOf(today);

  const [courses, recurring] = await Promise.all([
    getCourses(),
    getRecurringItems(),
  ]);

  const deadlines: DatedDeadline[] = courses.flatMap((c) =>
    c.deadlines.map((d) => ({ course: c.course, ...d })),
  );
  const deadlinesByDate = new Map<string, DatedDeadline[]>();
  for (const d of deadlines) {
    deadlinesByDate.set(d.due, [...(deadlinesByDate.get(d.due) ?? []), d]);
  }

  const blocks = buildWeeklyBlocks(courses, recurring);
  const conflicts = findBlockConflicts(blocks);
  const conflicted = new Set(conflicts.flatMap((c) => [c.a, c.b]));
  const pileUps = findDeadlinePileUps(deadlines);

  const weeks = monthGrid(month);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Schedule"
        description="Deadlines from your courses plus your weekly recurring blocks."
      >
        <ScheduleEntryButtons courses={courses.map((c) => c.course)} />
      </PageHeader>

      {conflicts.length > 0 || pileUps.length > 0 ? (
        <Card className="mb-4 border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-destructive" />
              Conflicts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {conflicts.map((c, i) => (
              <p key={`b-${i}`}>
                <Badge variant="destructive" className="mr-2">
                  overlap
                </Badge>
                {WEEKDAY_LABELS[c.day]}: <strong>{c.a.title}</strong> (
                {c.a.start}–{c.a.end}) collides with{" "}
                <strong>{c.b.title}</strong> ({c.b.start}–{c.b.end})
              </p>
            ))}
            {pileUps.map((p) => (
              <p key={p.date}>
                <Badge variant="destructive" className="mr-2">
                  {p.examCount >= 2 ? `${p.examCount} exams` : "pile-up"}
                </Badge>
                {p.date}: {p.count} deadlines due — {p.titles.join(", ")}
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{monthLabel(month)}</CardTitle>
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="icon-sm">
              <Link
                href={`/schedule?month=${addMonths(month, -1)}`}
                aria-label="Previous month"
              >
                <ChevronLeft className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/schedule">Today</Link>
            </Button>
            <Button asChild variant="ghost" size="icon-sm">
              <Link
                href={`/schedule?month=${addMonths(month, 1)}`}
                aria-label="Next month"
              >
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="bg-muted px-2 py-1.5 text-center text-xs font-medium text-muted-foreground"
              >
                {WEEKDAY_LABELS[d].slice(0, 3)}
              </div>
            ))}
            {weeks.flat().map((cell) => {
              const due = deadlinesByDate.get(cell.date) ?? [];
              const open = due.filter((d) => d.status !== "done");
              return (
                <div
                  key={cell.date}
                  className={cn(
                    "min-h-24 bg-card p-1.5",
                    !cell.inMonth && "bg-background",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex size-6 items-center justify-center rounded-full font-mono text-xs",
                      !cell.inMonth && "text-muted-foreground/50",
                      cell.date === today &&
                        "bg-primary text-primary-foreground",
                    )}
                  >
                    {Number(cell.date.slice(8))}
                  </span>
                  <div className="mt-1 space-y-1">
                    {open.slice(0, 2).map((d, i) => (
                      <p
                        key={i}
                        title={`${d.course}: ${d.title} (${d.kind})`}
                        className={cn(
                          "truncate rounded-sm px-1 py-0.5 text-[11px] leading-tight",
                          "bg-academics/10 text-academics",
                          d.kind === "exam" &&
                            "font-medium ring-1 ring-academics/40",
                        )}
                      >
                        {d.course} · {d.title}
                      </p>
                    ))}
                    {open.length > 2 ? (
                      <p className="px-1 text-[11px] text-muted-foreground">
                        +{open.length - 2} more
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Weekly rhythm</CardTitle>
        </CardHeader>
        <CardContent>
          {blocks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No recurring blocks yet — add your class times and standing
              commitments (gym, clubs…) to see your week and catch overlaps.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
              {WEEKDAYS.map((day) => {
                const dayBlocks = blocks.filter((b) => b.day === day);
                return (
                  <div key={day} className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      {WEEKDAY_LABELS[day]}
                    </p>
                    {dayBlocks.length === 0 ? (
                      <p className="text-xs text-muted-foreground/50">—</p>
                    ) : (
                      dayBlocks.map((b, i) => (
                        <div
                          key={i}
                          title={
                            b.location ? `${b.title} @ ${b.location}` : b.title
                          }
                          className={cn(
                            "rounded-md px-2 py-1.5 text-xs",
                            MODULE_CLASSES[b.module],
                            conflicted.has(b) &&
                              "ring-2 ring-destructive/60",
                          )}
                        >
                          <p className="truncate font-medium">{b.title}</p>
                          <p className="font-mono text-[11px] opacity-80">
                            {b.start}–{b.end}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
