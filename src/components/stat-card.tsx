import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  icon?: LucideIcon;
  /** A `text-<domain>` class; drives the accent stripe and icon color. */
  accentClass?: string;
}

export function StatCard({
  label,
  value,
  unit,
  sub,
  icon: Icon,
  accentClass,
}: StatCardProps) {
  return (
    <Card className={cn("relative py-0", accentClass)}>
      {/* Domain accent stripe — a colored file-tab down the left edge. */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1 bg-current"
      />
      <CardContent className="px-4 py-3.5 pl-5 text-foreground">
        <div className="flex items-start justify-between gap-2">
          <p className="label-mono truncate">{label}</p>
          {Icon ? <Icon className="size-4 shrink-0 text-current" /> : null}
        </div>
        <p className="mt-1.5 font-mono text-2xl font-semibold tracking-tight tabular-nums">
          {value}
          {unit ? (
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              {unit}
            </span>
          ) : null}
        </p>
        {sub ? (
          <p className="mt-0.5 truncate font-mono text-[0.7rem] tracking-wide text-muted-foreground">
            {sub}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
