"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-lg pt-16">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <TriangleAlert className="size-5" />
            </div>
            <div className="space-y-1">
              <CardTitle>Something went wrong</CardTitle>
              <CardDescription>
                Usually a hiccup reading the vault — your notes are safe.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="rounded-md bg-muted p-3 font-mono text-xs break-all">
            {error.message || "Unknown error"}
          </p>
          <Button onClick={reset}>
            <RotateCcw className="size-4" />
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
