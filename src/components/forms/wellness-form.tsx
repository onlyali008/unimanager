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
import { Textarea } from "@/components/ui/textarea";
import { todayISO } from "@/lib/vault/dates";

import { EntryDialog } from "./entry-dialog";
import { Field } from "./field";
import { useEntrySubmit } from "./use-entry-submit";

function ScaleSelect({
  value,
  onChange,
  low,
  high,
}: {
  value: string;
  onChange: (v: string) => void;
  low: string;
  high: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {["1", "2", "3", "4", "5"].map((n) => (
          <SelectItem key={n} value={n}>
            {n}
            {n === "1" ? ` — ${low}` : n === "5" ? ` — ${high}` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function WellnessFormInner() {
  const { submit, busy } = useEntrySubmit("wellness");
  const [date, setDate] = useState(todayISO());
  const [mood, setMood] = useState("3");
  const [energy, setEnergy] = useState("3");
  const [stress, setStress] = useState("2");
  const [symptoms, setSymptoms] = useState("");
  const [notes, setNotes] = useState("");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    await submit(
      {
        date,
        mood: Number(mood),
        energy: Number(energy),
        stress: Number(stress),
        symptoms: symptoms
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        notes: notes.trim() || undefined,
      },
      "Check-in saved",
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date" htmlFor="we-date" className="col-span-2">
          <Input
            id="we-date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label="Mood">
          <ScaleSelect value={mood} onChange={setMood} low="rough" high="great" />
        </Field>
        <Field label="Energy">
          <ScaleSelect
            value={energy}
            onChange={setEnergy}
            low="drained"
            high="energized"
          />
        </Field>
        <Field label="Stress">
          <ScaleSelect
            value={stress}
            onChange={setStress}
            low="calm"
            high="overwhelmed"
          />
        </Field>
        <Field
          label="Symptoms"
          htmlFor="we-symptoms"
          hint="Comma-separated, e.g. headache, sore throat."
        >
          <Input
            id="we-symptoms"
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
          />
        </Field>
        <Field label="Notes" htmlFor="we-notes" className="col-span-2">
          <Textarea
            id="we-notes"
            rows={3}
            placeholder="Anything worth remembering about today?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        Save check-in
      </Button>
    </form>
  );
}

export function WellnessEntryButton() {
  return (
    <EntryDialog title="Daily check-in" triggerLabel="Check in">
      <WellnessFormInner />
    </EntryDialog>
  );
}
