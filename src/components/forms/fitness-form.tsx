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

const CATEGORIES = ["strength", "cardio", "sport", "mobility", "other"] as const;
const INTENSITY_LABELS: Record<string, string> = {
  "1": "1 — easy",
  "2": "2 — light",
  "3": "3 — moderate",
  "4": "4 — hard",
  "5": "5 — max effort",
};

function WorkoutFormInner() {
  const { submit, busy } = useEntrySubmit("fitness");
  const [date, setDate] = useState(todayISO());
  const [activity, setActivity] = useState("");
  const [category, setCategory] = useState<string>("strength");
  const [duration, setDuration] = useState("45");
  const [intensity, setIntensity] = useState("3");
  const [calories, setCalories] = useState("");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    await submit(
      {
        date,
        workout: {
          activity: activity.trim(),
          category,
          duration_min: Number(duration),
          intensity: Number(intensity),
          calories_burned: calories === "" ? null : Number(calories),
        },
      },
      "Workout logged",
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Activity" htmlFor="wo-activity" className="col-span-2">
          <Input
            id="wo-activity"
            required
            placeholder="e.g. Push day, 5k run, badminton"
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
          />
        </Field>
        <Field label="Date" htmlFor="wo-date">
          <Input
            id="wo-date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label="Category">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c[0].toUpperCase() + c.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Duration (min)" htmlFor="wo-duration">
          <Input
            id="wo-duration"
            type="number"
            min="1"
            step="1"
            required
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </Field>
        <Field label="Intensity">
          <Select value={intensity} onValueChange={setIntensity}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(INTENSITY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field
          label="Calories burned"
          htmlFor="wo-calories"
          hint="Optional."
          className="col-span-2"
        >
          <Input
            id="wo-calories"
            type="number"
            min="0"
            step="1"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
          />
        </Field>
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        Log workout
      </Button>
    </form>
  );
}

export function FitnessEntryButton() {
  return (
    <EntryDialog title="Log a workout" triggerLabel="Log workout">
      <WorkoutFormInner />
    </EntryDialog>
  );
}
