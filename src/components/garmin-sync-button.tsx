"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Watch } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface SyncSummary {
  workoutsAdded: number;
  sleepNightsWritten: number;
  wellnessDaysUpdated: number;
  errors: string[];
}

export function GarminSyncButton({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function sync() {
    if (!configured) {
      toast.info(
        "Set GARMIN_EMAIL and GARMIN_PASSWORD in .env.local (then restart the dev server) to sync your watch. Accounts with MFA enabled aren't supported.",
      );
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/garmin/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 7 }),
      });
      const data = (await res.json()) as {
        summary?: SyncSummary;
        error?: string;
      };
      if (!res.ok || !data.summary) {
        throw new Error(data.error ?? `Sync failed (${res.status})`);
      }
      const s = data.summary;
      toast.success(
        `Garmin: ${s.workoutsAdded} workouts, ${s.sleepNightsWritten} nights, ${s.wellnessDaysUpdated} wellness days`,
        {
          description: s.errors.length
            ? `${s.errors.length} item(s) failed — see server logs.`
            : undefined,
        },
      );
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" onClick={sync} disabled={busy}>
      {busy ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Watch className="size-4" />
      )}
      {busy ? "Syncing…" : "Sync Garmin"}
    </Button>
  );
}
