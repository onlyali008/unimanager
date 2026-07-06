import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";

import { ScheduleEntryButtons } from "@/components/forms/schedule-forms";
import { PageHeader } from "@/components/page-header";
import { BlockChip, DayTimeline } from "@/components/schedule-blocks";
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
  layoutDayBlocks,
  monthGrid,
  monthLabel,
  WEEKDAY_LABELS,
  WEEKDAYS,
  weekdayOf,
  type DatedDeadline,
} from "@/lib/schedule";
import { monthOf, toISODate, todayISO } from "@/lib/vault/dates";
import { getCourses, getRecurringItems } from "@/lib/vault/entries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Schedule" };
export const dynamic = "force-dynamic";

function addDays(dateISO: string, delta: number): string {
  const d = new Date(`${dateISO}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return toISODate(d);
}

function dayLabel(dateISO: string): string {
  return new Date(`${dateISO}T12:00:00`).toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; day?: string }>;
}) {
  const params = await searchParams;
  const today = todayISO();
  const month = /^\d{4}-\d{2}$/.test(params.month ?? "")
    ? (params.month as string)
    : monthOf(today);
  const day = /^\d{4}-\d{2}-\d{2}$/.test(params.day ?? "")
    ? (params.day as string)
    : today;

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

  const dayWeekday = weekdayOf(day);
  const dayBlocks = layoutDayBlocks(blocks.filter((b) => b.day === dayWeekday));
  const dayDeadlines = (deadlinesByDate.get(day) ?? []).filter(
    (d) => d.status !== "done",
  );
  const now = new Date();
  const nowMinutes = day === today ? now.getHours() * 60 + now.getMinutes() : null;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Schedule"
        description="Deadlines from your courses plus your weekly recurring blocks — click any block to edit it."
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

      <Card className="mb-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            {dayLabel(day)}
            {day === today ? (
              <Badge variant="secondary" className="ml-2">
                today
              </Badge>
            ) : null}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="icon-sm">
              <Link
                href={`/schedule?day=${addDays(day, -1)}`}
                aria-label="Previous day"
              >
                <ChevronLeft className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/schedule">Today</Link>
            </Button>
            <Button asChild variant="ghost" size="icon-sm">
              <Link
                href={`/schedule?day=${addDays(day, 1)}`}
                aria-label="Next day"
              >
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {dayDeadlines.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {dayDeadlines.map((d, i) => (
                <Badge key={i} variant="outline" className="bg-academics/10 text-academics">
                  due: {d.course} · {d.title}
                </Badge>
              ))}
            </div>
          ) : null}
          <div className="max-h-[28rem] overflow-y-auto pr-1">
            <DayTimeline blocks={dayBlocks} nowMinutes={nowMinutes} />
          </div>
        </CardContent>
      </Card>

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
                <Link
                  key={cell.date}
                  href={`/schedule?day=${cell.date}`}
                  className={cn(
                    "min-h-24 bg-card p-1.5 transition-colors hover:bg-accent/40",
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
                </Link>
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
              commitments (gym, reading, clubs…) to see your week and catch
              overlaps.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
              {WEEKDAYS.map((weekday) => {
                const weekdayBlocks = blocks.filter((b) => b.day === weekday);
                return (
                  <div key={weekday} className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      {WEEKDAY_LABELS[weekday]}
                    </p>
                    {weekdayBlocks.length === 0 ? (
                      <p className="text-xs text-muted-foreground/50">—</p>
                    ) : (
                      weekdayBlocks.map((b, i) => (
                        <BlockChip
                          key={i}
                          block={b}
                          conflicted={conflicted.has(b)}
                        />
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
