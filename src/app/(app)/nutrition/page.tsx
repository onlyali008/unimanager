import type { Metadata } from "next";
import { Flame, Beef, CalendarRange } from "lucide-react";

import { NutritionEntryButton } from "@/components/forms/nutrition-form";
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
import { getRecentNutrition } from "@/lib/vault/entries";
import { lastNDates, todayISO } from "@/lib/vault/dates";

export const metadata: Metadata = { title: "Nutrition" };
export const dynamic = "force-dynamic";

export default async function NutritionPage() {
  const notes = await getRecentNutrition(30);
  const byDate = new Map(notes.map((n) => [n.date, n.frontmatter]));
  const today = byDate.get(todayISO());

  const loggedDays = notes.filter((n) => n.frontmatter.meals.length > 0);
  const last7 = loggedDays.filter((n) =>
    lastNDates(7).includes(n.date),
  );
  const avg7 =
    last7.length > 0
      ? Math.round(
          last7.reduce((s, n) => s + n.frontmatter.totals.calories, 0) /
            last7.length,
        )
      : null;

  const chartData = lastNDates(30).map((date) => ({
    date,
    value: byDate.get(date)?.totals.calories ?? null,
  }));

  const recentMeals = [...notes]
    .reverse()
    .flatMap((n) =>
      n.frontmatter.meals.map((meal) => ({ date: n.date, ...meal })),
    )
    .slice(0, 15);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Nutrition"
        description="Meals from your vault, with USDA-powered macros."
      >
        <NutritionEntryButton />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Today"
          value={today ? String(today.totals.calories) : "—"}
          unit="kcal"
          icon={Flame}
          accentClass="text-nutrition"
        />
        <StatCard
          label="Protein today"
          value={today ? String(today.totals.protein_g) : "—"}
          unit="g"
          icon={Beef}
          accentClass="text-nutrition"
        />
        <StatCard
          label="7-day average"
          value={avg7 === null ? "—" : String(avg7)}
          unit="kcal"
          sub={`${last7.length}/7 days logged`}
          icon={CalendarRange}
          accentClass="text-nutrition"
        />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Calories — last 30 days</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart
            data={chartData}
            label="Calories"
            color="var(--domain-nutrition)"
            kind="bar"
          />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Recent meals</CardTitle>
        </CardHeader>
        <CardContent>
          {recentMeals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing logged yet — add your first meal.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Food</TableHead>
                  <TableHead>Meal</TableHead>
                  <TableHead className="text-right">Portion</TableHead>
                  <TableHead className="text-right">kcal</TableHead>
                  <TableHead className="text-right">P / C / F</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentMeals.map((meal, i) => (
                  <TableRow key={`${meal.date}-${i}`}>
                    <TableCell className="font-mono text-xs">
                      {meal.date}
                    </TableCell>
                    <TableCell className="max-w-52 truncate">
                      {meal.name}
                    </TableCell>
                    <TableCell className="capitalize">{meal.meal}</TableCell>
                    <TableCell className="text-right font-mono">
                      {meal.portion_g} g
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {meal.calories}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {meal.protein_g} / {meal.carbs_g} / {meal.fat_g}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{meal.source}</Badge>
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
