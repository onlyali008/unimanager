import type { Metadata } from "next";
import { Smile, BatteryCharging, Footprints } from "lucide-react";

import { WellnessEntryButton } from "@/components/forms/wellness-form";
import { GarminSyncButton } from "@/components/garmin-sync-button";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { TrendChart } from "@/components/trend-chart";
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
import { lastNDates, todayISO } from "@/lib/vault/dates";
import { getRecentWellness } from "@/lib/vault/entries";

export const metadata: Metadata = { title: "Wellness" };
export const dynamic = "force-dynamic";

export default async function WellnessPage() {
  const notes = await getRecentWellness(30);
  const byDate = new Map(notes.map((n) => [n.date, n.frontmatter]));
  const today = byDate.get(todayISO());
  const latestGarmin = [...notes]
    .reverse()
    .find((n) => n.frontmatter.garmin !== null)?.frontmatter;

  const chartData = lastNDates(30).map((date) => ({
    date,
    value: byDate.get(date)?.mood ?? null,
  }));

  const recent = [...notes].reverse().slice(0, 14);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Wellness"
        description="Daily check-ins alongside objective metrics from your Garmin."
      >
        <div className="flex gap-2">
          <GarminSyncButton configured={garminConfigured()} />
          <WellnessEntryButton />
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Today"
          value={today?.mood != null ? `${today.mood}/5` : "—"}
          sub={
            today?.energy != null && today?.stress != null
              ? `energy ${today.energy}/5 · stress ${today.stress}/5`
              : "no check-in yet"
          }
          icon={Smile}
          accentClass="text-wellness"
        />
        <StatCard
          label="Steps"
          value={
            latestGarmin?.garmin?.steps != null
              ? latestGarmin.garmin.steps.toLocaleString()
              : "—"
          }
          sub={latestGarmin ? `Garmin, ${latestGarmin.date}` : "sync Garmin"}
          icon={Footprints}
          accentClass="text-wellness"
        />
        <StatCard
          label="Resting HR / body battery"
          value={
            latestGarmin?.garmin?.resting_hr != null
              ? String(latestGarmin.garmin.resting_hr)
              : "—"
          }
          unit={latestGarmin?.garmin?.resting_hr != null ? "bpm" : undefined}
          sub={
            latestGarmin?.garmin?.body_battery_high != null
              ? `battery ${latestGarmin.garmin.body_battery_low ?? "?"}–${latestGarmin.garmin.body_battery_high}`
              : undefined
          }
          icon={BatteryCharging}
          accentClass="text-wellness"
        />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Mood — last 30 days</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart
            data={chartData}
            label="Mood"
            color="var(--domain-wellness)"
            kind="area"
          />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Recent check-ins</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No check-ins yet — how are you feeling today?
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Mood</TableHead>
                  <TableHead className="text-right">Energy</TableHead>
                  <TableHead className="text-right">Stress</TableHead>
                  <TableHead>Symptoms</TableHead>
                  <TableHead className="text-right">Steps</TableHead>
                  <TableHead className="text-right">RHR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((n) => (
                  <TableRow key={n.date}>
                    <TableCell className="font-mono text-xs">
                      {n.date}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {n.frontmatter.mood ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {n.frontmatter.energy ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {n.frontmatter.stress ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-40 truncate text-xs">
                      {n.frontmatter.symptoms.join(", ") || "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {n.frontmatter.garmin?.steps?.toLocaleString() ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {n.frontmatter.garmin?.resting_hr ?? "—"}
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
