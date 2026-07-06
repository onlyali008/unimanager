"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { todayISO } from "@/lib/vault/dates";

import { EntryDialog } from "./entry-dialog";
import { Field } from "./field";
import { useEntrySubmit } from "./use-entry-submit";

const QUALITY_LABELS: Record<string, string> = {
  "1": "1 — terrible",
  "2": "2 — poor",
  "3": "3 — okay",
  "4": "4 — good",
  "5": "5 — fully rested",
};

/** Hours between bed and wake, wrapping past midnight. */
function computeDuration(bedtime: string, wake: string): number | null {
  const [bh, bm] = bedtime.split(":").map(Number);
  const [wh, wm] = wake.split(":").map(Number);
  if ([bh, bm, wh, wm].some(Number.isNaN)) return null;
  let minutes = wh * 60 + wm - (bh * 60 + bm);
  if (minutes <= 0) minutes += 24 * 60;
  return Math.round((minutes / 60) * 10) / 10;
}

function SleepFormInner() {
  const { submit, busy } = useEntrySubmit("sleep");
  const [date, setDate] = useState(todayISO());
  const [bedtime, setBedtime] = useState("23:30");
  const [wakeTime, setWakeTime] = useState("07:30");
  const [quality, setQuality] = useState("3");
  const [interruptions, setInterruptions] = useState("0");
  const [naps, setNaps] = useState("0");

  const duration = computeDuration(bedtime, wakeTime);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (duration === null) return;
    await submit(
      {
        date,
        bedtime,
        wake_time: wakeTime,
        duration_h: duration,
        quality: Number(quality),
        interruptions: Number(interruptions),
        naps_min: Number(naps),
      },
      "Sleep logged",
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Morning of"
          htmlFor="sl-date"
          hint="The day you woke up."
        >
          <Input
            id="sl-date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label="Quality">
          <Select value={quality} onValueChange={setQuality}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(QUALITY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Bedtime" htmlFor="sl-bed">
          <Input
            id="sl-bed"
            type="time"
            required
            value={bedtime}
            onChange={(e) => setBedtime(e.target.value)}
          />
        </Field>
        <Field label="Wake time" htmlFor="sl-wake">
          <Input
            id="sl-wake"
            type="time"
            required
            value={wakeTime}
            onChange={(e) => setWakeTime(e.target.value)}
          />
        </Field>
        <Field label="Interruptions" htmlFor="sl-int">
          <Input
            id="sl-int"
            type="number"
            min="0"
            step="1"
            value={interruptions}
            onChange={(e) => setInterruptions(e.target.value)}
          />
        </Field>
        <Field label="Naps (min)" htmlFor="sl-naps">
          <Input
            id="sl-naps"
            type="number"
            min="0"
            step="5"
            value={naps}
            onChange={(e) => setNaps(e.target.value)}
          />
        </Field>
      </div>
      <p className="text-sm text-muted-foreground">
        Duration:{" "}
        <span className="font-mono font-medium text-foreground">
          {duration ?? "—"} h
        </span>
      </p>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        Log sleep
      </Button>
    </form>
  );
}

export function SleepEntryButton() {
  return (
    <EntryDialog title="Log last night's sleep" triggerLabel="Log sleep">
      <SleepFormInner />
    </EntryDialog>
  );
}
