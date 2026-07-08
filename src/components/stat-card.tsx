import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  icon?: LucideIcon;
  /** A `text-<domain>` class; drives the top rule and icon color. */
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
    <div
      className={cn(
        "relative border border-border bg-card",
        accentClass,
      )}
    >
      {/* Domain accent — a hairline rule across the top edge. */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px] bg-current"
      />
      <div className="px-4 pt-4 pb-3.5 text-foreground">
        <div className="flex items-start justify-between gap-2">
          <p className="label-mono truncate">{label}</p>
          {Icon ? <Icon className="size-4 shrink-0 text-current" /> : null}
        </div>
        <p className="mt-2 font-heading text-3xl leading-none font-extrabold tracking-[-0.02em] tabular-nums">
          {value}
          {unit ? (
            <span className="ml-1 text-base font-medium text-muted-foreground">
              {unit}
            </span>
          ) : null}
        </p>
        {sub ? (
          <p className="mt-2 truncate font-mono text-[0.7rem] tracking-wide text-muted-foreground">
            {sub}
          </p>
        ) : null}
      </div>
    </div>
  );
}
