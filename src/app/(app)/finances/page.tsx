import type { Metadata } from "next";
import { ArrowDownRight, ArrowUpRight, Scale } from "lucide-react";

import { FinancesEntryButton } from "@/components/forms/finances-form";
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
import { lastNDates, monthOf, todayISO } from "@/lib/vault/dates";
import { getRecentFinances } from "@/lib/vault/entries";

export const metadata: Metadata = { title: "Finances" };
export const dynamic = "force-dynamic";

const cad = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

export default async function FinancesPage() {
  const months = await getRecentFinances(30);
  const thisMonth = months.find((m) => m.month === monthOf(todayISO()));

  const allTx = months.flatMap((m) => m.transactions);
  const days = lastNDates(30);
  const spendByDay = new Map<string, number>();
  for (const tx of allTx) {
    if (tx.amount < 0 && days.includes(tx.date)) {
      spendByDay.set(
        tx.date,
        (spendByDay.get(tx.date) ?? 0) + Math.abs(tx.amount),
      );
    }
  }
  const chartData = days.map((date) => ({
    date,
    value: spendByDay.has(date)
      ? Math.round(spendByDay.get(date)! * 100) / 100
      : null,
  }));

  const recentTx = [...allTx]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 15);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Finances"
        description="One markdown note per month, one line per transaction (CAD)."
      >
        <FinancesEntryButton />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Spent this month"
          value={thisMonth ? cad.format(thisMonth.totals.expenses) : "—"}
          icon={ArrowDownRight}
          accentClass="text-finances"
        />
        <StatCard
          label="Income this month"
          value={thisMonth ? cad.format(thisMonth.totals.income) : "—"}
          icon={ArrowUpRight}
          accentClass="text-finances"
        />
        <StatCard
          label="Net this month"
          value={thisMonth ? cad.format(thisMonth.totals.net) : "—"}
          icon={Scale}
          accentClass="text-finances"
        />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">
            Daily spending — last 30 days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart
            data={chartData}
            label="Spent (CAD)"
            color="var(--domain-finances)"
            kind="bar"
          />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Recent transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTx.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No transactions yet — add your first one.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTx.map((tx, i) => (
                  <TableRow key={`${tx.date}-${i}`}>
                    <TableCell className="font-mono text-xs">
                      {tx.date}
                    </TableCell>
                    <TableCell className="max-w-56 truncate">
                      {tx.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {tx.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {tx.amount > 0 ? "+" : ""}
                      {cad.format(tx.amount)}
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
