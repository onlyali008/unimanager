import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  icon?: LucideIcon;
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
    <Card className="py-4">
      <CardContent className="flex items-center gap-3 px-4">
        {Icon ? (
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted",
              accentClass,
            )}
          >
            <Icon className="size-4.5" />
          </div>
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="font-mono text-2xl font-semibold tracking-tight">
            {value}
            {unit ? (
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                {unit}
              </span>
            ) : null}
          </p>
          {sub ? (
            <p className="truncate text-xs text-muted-foreground">{sub}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
