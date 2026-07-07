import type { LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconClass?: string;
  phase: string;
  vaultFolder?: string;
  upcoming: string[];
}

export function PlaceholderPage({
  title,
  description,
  icon: Icon,
  iconClass,
  phase,
  vaultFolder,
  upcoming,
}: PlaceholderPageProps) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader title={title} description={description} />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted",
                iconClass,
              )}
            >
              <Icon className="size-5" />
            </div>
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                Coming in {phase}
                <Badge variant="secondary">planned</Badge>
              </CardTitle>
              {vaultFolder ? (
                <CardDescription className="font-mono text-xs">
                  vault: {vaultFolder}
                </CardDescription>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {upcoming.map((feature) => (
              <li key={feature} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 bg-current opacity-40" />
                {feature}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
