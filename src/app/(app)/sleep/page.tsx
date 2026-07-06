import type { Metadata } from "next";
import { BedDouble, Gauge, CalendarRange } from "lucide-react";

import { SleepEntryButton } from "@/components/forms/sleep-form";
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
import { getRecentSleep } from "@/lib/vault/entries";

export const metadata: Metadata = { title: "Sleep" };
export const dynamic = "force-dynamic";

export default async function SleepPage() {
  const notes = await getRecentSleep(30);
  const byDate = new Map(notes.map((n) => [n.date, n.frontmatter]));

  const latest = notes.at(-1)?.frontmatter ?? null;
  const week = notes.filter((n) => lastNDates(7).includes(n.date));
  const avgDuration =
    week.length > 0
      ? Math.round(
          (week.reduce((s, n) => s + n.frontmatter.duration_h, 0) /
            week.length) *
            10,
        ) / 10
      : null;
  const avgQuality =
    week.length > 0
      ? Math.round(
          (week.reduce((s, n) => s + n.frontmatter.quality, 0) / week.length) *
            10,
        ) / 10
      : null;

  const chartData = lastNDates(30).map((date) => ({
    date,
    value: byDate.get(date)?.duration_h ?? null,
  }));

  const recent = [...notes].reverse().slice(0, 14);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Sleep"
        description="Nights from your vault — logged by hand or pulled from Garmin."
      >
        <div className="flex gap-2">
          <GarminSyncButton configured={garminConfigured()} />
          <SleepEntryButton />
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={latest ? `Last night (${latest.date})` : "Last night"}
          value={latest ? String(latest.duration_h) : "—"}
          unit="h"
          icon={BedDouble}
          accentClass="text-sleep"
        />
        <StatCard
          label="Quality last night"
          value={latest ? `${latest.quality}/5` : "—"}
          sub={
            latest?.sleep_score != null
              ? `Garmin score ${latest.sleep_score}`
              : undefined
          }
          icon={Gauge}
          accentClass="text-sleep"
        />
        <StatCard
          label="7-day average"
          value={avgDuration === null ? "—" : String(avgDuration)}
          unit="h"
          sub={avgQuality === null ? undefined : `quality ${avgQuality}/5`}
          icon={CalendarRange}
          accentClass="text-sleep"
        />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">
            Sleep duration — last 30 days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart
            data={chartData}
            label="Hours"
            color="var(--domain-sleep)"
            kind="bar"
          />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Recent nights</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No nights logged yet — log one or sync your Garmin.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Morning of</TableHead>
                  <TableHead>Bed</TableHead>
                  <TableHead>Wake</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead className="text-right">Quality</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((n) => (
                  <TableRow key={n.date}>
                    <TableCell className="font-mono text-xs">
                      {n.date}
                    </TableCell>
                    <TableCell className="font-mono">
                      {n.frontmatter.bedtime}
                    </TableCell>
                    <TableCell className="font-mono">
                      {n.frontmatter.wake_time}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {n.frontmatter.duration_h} h
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {n.frontmatter.quality}/5
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {n.frontmatter.sleep_score ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{n.frontmatter.source}</Badge>
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
