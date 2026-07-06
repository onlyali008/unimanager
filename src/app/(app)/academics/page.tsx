import type { Metadata } from "next";
import { BookOpen, CalendarClock, GraduationCap } from "lucide-react";

import { AcademicsEntryButtons } from "@/components/forms/academics-form";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { TrendChart } from "@/components/trend-chart";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toISODate, todayISO } from "@/lib/vault/dates";
import { getCourses } from "@/lib/vault/entries";

export const metadata: Metadata = { title: "Academics" };
export const dynamic = "force-dynamic";

/** The next `n` dates starting today, oldest first. */
function nextNDates(n: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    dates.push(toISODate(d));
  }
  return dates;
}

export default async function AcademicsPage() {
  const courses = await getCourses();
  const today = todayISO();

  const allDeadlines = courses.flatMap((c) =>
    c.deadlines.map((d) => ({ course: c.course, ...d })),
  );
  const open = allDeadlines.filter((d) => d.status !== "done");
  const upcoming = open
    .filter((d) => d.due >= today)
    .sort((a, b) => a.due.localeCompare(b.due));
  const overdue = open.filter((d) => d.due < today);

  // Forward-looking chart: deadlines due per day over the next 30 days.
  const horizon = nextNDates(30);
  const dueByDay = new Map<string, number>();
  for (const d of open) {
    if (horizon.includes(d.due)) {
      dueByDay.set(d.due, (dueByDay.get(d.due) ?? 0) + 1);
    }
  }
  const chartData = horizon.map((date) => ({
    date,
    value: dueByDay.get(date) ?? null,
  }));

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Academics"
        description="One note per course — deadlines and class notes together."
      >
        <AcademicsEntryButtons courses={courses.map((c) => c.course)} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Courses"
          value={String(courses.length)}
          icon={BookOpen}
          accentClass="text-academics"
        />
        <StatCard
          label="Open deadlines"
          value={String(open.length)}
          sub={overdue.length > 0 ? `${overdue.length} overdue` : undefined}
          icon={CalendarClock}
          accentClass="text-academics"
        />
        <StatCard
          label="Next due"
          value={upcoming[0]?.due ?? "—"}
          sub={
            upcoming[0] ? `${upcoming[0].course} · ${upcoming[0].title}` : undefined
          }
          icon={GraduationCap}
          accentClass="text-academics"
        />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">
            Deadlines due — next 30 days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart
            data={chartData}
            label="Due"
            color="var(--domain-academics)"
            kind="bar"
          />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Upcoming deadlines</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 && overdue.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No open deadlines{courses.length === 0 ? " — add a course to get started" : ""}.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Due</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead className="text-right">Weight</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...overdue, ...upcoming].slice(0, 20).map((d, i) => (
                  <TableRow key={`${d.course}-${d.title}-${i}`}>
                    <TableCell className="font-mono text-xs">
                      {d.due}
                      {d.due < today ? (
                        <Badge variant="destructive" className="ml-2">
                          overdue
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>{d.course}</TableCell>
                    <TableCell className="max-w-52 truncate">
                      {d.title}
                    </TableCell>
                    <TableCell className="capitalize">{d.kind}</TableCell>
                    <TableCell className="text-right font-mono">
                      {d.weight_pct != null ? `${d.weight_pct}%` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {d.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {courses.length > 0 ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Courses</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {courses.map((c) => (
              <div
                key={c.course}
                className="rounded-lg border p-3 text-sm"
              >
                <p className="font-medium">
                  {c.course}{" "}
                  <span className="text-muted-foreground">
                    · {c.course_name}
                  </span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {c.term} · {c.credits} credits ·{" "}
                  {c.deadlines.filter((d) => d.status !== "done").length} open
                  deadline(s)
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
