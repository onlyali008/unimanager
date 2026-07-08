"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export interface TrendPoint {
  date: string;
  value: number | null;
}

interface TrendChartProps {
  data: TrendPoint[];
  /** Series name shown in the tooltip, e.g. "Calories". */
  label: string;
  /** CSS color, e.g. "var(--domain-nutrition)". */
  color: string;
  kind?: "bar" | "area";
}

/**
 * Single-series 30-day trend. Missing days stay as gaps (null), which is
 * honest about what was and wasn't logged.
 */
export function TrendChart({
  data,
  label,
  color,
  kind = "bar",
}: TrendChartProps) {
  const config: ChartConfig = { value: { label, color } };
  const monthDay = (d: string) => d.slice(5);

  if (data.every((point) => point.value === null)) {
    return (
      <div className="flex h-56 w-full flex-col items-center justify-center gap-2 border border-dashed border-border bg-[repeating-linear-gradient(135deg,transparent,transparent_9px,var(--muted)_9px,var(--muted)_10px)] text-center">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Nothing logged yet
        </p>
        <p className="max-w-xs text-sm text-muted-foreground">
          The trend appears once you start logging.
        </p>
      </div>
    );
  }

  const axes = (
    <>
      <CartesianGrid vertical={false} strokeOpacity={0.35} />
      <XAxis
        dataKey="date"
        tickLine={false}
        axisLine={false}
        tickMargin={8}
        minTickGap={28}
        tickFormatter={monthDay}
      />
      <YAxis width={36} tickLine={false} axisLine={false} allowDecimals={false} />
      <ChartTooltip content={<ChartTooltipContent />} />
    </>
  );

  return (
    <ChartContainer config={config} className="h-56 w-full">
      {kind === "bar" ? (
        <BarChart data={data} margin={{ top: 8, right: 8 }}>
          {axes}
          <Bar
            dataKey="value"
            fill="var(--color-value)"
            radius={[0, 0, 0, 0]}
            maxBarSize={16}
          />
        </BarChart>
      ) : (
        <AreaChart data={data} margin={{ top: 8, right: 8 }}>
          {axes}
          <Area
            dataKey="value"
            stroke="var(--color-value)"
            strokeWidth={2}
            fill="var(--color-value)"
            fillOpacity={0.12}
            dot={false}
            connectNulls={false}
          />
        </AreaChart>
      )}
    </ChartContainer>
  );
}
