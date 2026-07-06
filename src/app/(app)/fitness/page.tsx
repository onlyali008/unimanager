import type { Metadata } from "next";
import { Activity, Clock, Flame } from "lucide-react";

import { FitnessEntryButton } from "@/components/forms/fitness-form";
import { GarminSyncButton } from "@/components/garmin-sync-button";
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
import { garminConfigured } from "@/lib/garmin/client";
import { lastNDates } from "@/lib/vault/dates";
import { getRecentFitness } from "@/lib/vault/entries";

export const metadata: Metadata = { title: "Fitness" };
export const dynamic = "force-dynamic";

export default async function FitnessPage() {
  const notes = await getRecentFitness(30);
  const byDate = new Map(notes.map((n) => [n.date, n.frontmatter]));

  const week = lastNDates(7);
  const weekNotes = notes.filter((n) => week.includes(n.date));
  const weekSessions = weekNotes.reduce(
    (s, n) => s + n.frontmatter.totals.sessions,
    0,
  );
  const weekMinutes = weekNotes.reduce(
    (s, n) => s + n.frontmatter.totals.duration_min,
    0,
  );
  const weekCalories = weekNotes.reduce(
    (s, n) =>
      s +
      n.frontmatter.workouts.reduce((c, w) => c + (w.calories_burned ?? 0), 0),
    0,
  );

  const chartData = lastNDates(30).map((date) => ({
    date,
    value: byDate.get(date)?.totals.duration_min ?? null,
  }));

  const recentWorkouts = [...notes]
    .reverse()
    .flatMap((n) =>
      n.frontmatter.workouts.map((w) => ({ date: n.date, ...w })),
    )
    .slice(0, 15);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Fitness"
        description="Workouts you log plus activities pulled from your Garmin watch."
      >
        <div className="flex gap-2">
          <GarminSyncButton configured={garminConfigured()} />
          <FitnessEntryButton />
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Sessions this week"
          value={String(weekSessions)}
          icon={Activity}
          accentClass="text-fitness"
        />
        <StatCard
          label="Active minutes this week"
          value={String(weekMinutes)}
          unit="min"
          icon={Clock}
          accentClass="text-fitness"
        />
        <StatCard
          label="Calories burned this week"
          value={weekCalories > 0 ? String(Math.round(weekCalories)) : "—"}
          unit="kcal"
          icon={Flame}
          accentClass="text-fitness"
        />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">
            Active minutes — last 30 days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart
            data={chartData}
            label="Minutes"
            color="var(--domain-fitness)"
            kind="bar"
          />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Recent workouts</CardTitle>
        </CardHeader>
        <CardContent>
          {recentWorkouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No workouts yet — log one or sync your Garmin.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead className="text-right">Intensity</TableHead>
                  <TableHead className="text-right">kcal</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentWorkouts.map((w, i) => (
                  <TableRow key={`${w.date}-${i}`}>
                    <TableCell className="font-mono text-xs">
                      {w.date}
                    </TableCell>
                    <TableCell className="max-w-52 truncate">
                      {w.activity}
                    </TableCell>
                    <TableCell className="capitalize">{w.category}</TableCell>
                    <TableCell className="text-right font-mono">
                      {w.duration_min} min
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {w.intensity}/5
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {w.calories_burned ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{w.source}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
