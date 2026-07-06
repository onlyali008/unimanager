"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { EntryDialog, useEntryDialogClose } from "./entry-dialog";
import { Field } from "./field";

const DAYS = [
  ["mon", "Monday"],
  ["tue", "Tuesday"],
  ["wed", "Wednesday"],
  ["thu", "Thursday"],
  ["fri", "Friday"],
  ["sat", "Saturday"],
  ["sun", "Sunday"],
] as const;

function useScheduleSubmit() {
  const router = useRouter();
  const close = useEntryDialogClose();
  const [busy, setBusy] = useState(false);

  async function submit(payload: unknown, successMessage: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Save failed (${res.status})`);
      toast.success(successMessage);
      close();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return { submit, busy };
}

function DaySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {DAYS.map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function MeetingFormInner({ courses }: { courses: string[] }) {
  const { submit, busy } = useScheduleSubmit();
  const [course, setCourse] = useState(courses[0] ?? "");
  const [day, setDay] = useState("mon");
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("11:00");
  const [location, setLocation] = useState("");

  if (courses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add a course on the Academics page first — class times live inside
        the course note.
      </p>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await submit(
          {
            action: "meeting",
            course,
            day,
            start,
            end,
            location: location.trim() || null,
          },
          "Class time added",
        );
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Course" className="col-span-2">
          <Select value={course} onValueChange={setCourse}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Day" className="col-span-2">
          <DaySelect value={day} onChange={setDay} />
        </Field>
        <Field label="Starts" htmlFor="mt-start">
          <Input
            id="mt-start"
            type="time"
            required
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </Field>
        <Field label="Ends" htmlFor="mt-end">
          <Input
            id="mt-end"
            type="time"
            required
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </Field>
        <Field label="Location" htmlFor="mt-loc" className="col-span-2">
          <Input
            id="mt-loc"
            placeholder="optional, e.g. MC 2054"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </Field>
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        Add class time
      </Button>
    </form>
  );
}

function RecurringFormInner() {
  const { submit, busy } = useScheduleSubmit();
  const [title, setTitle] = useState("");
  const [module, setModule] = useState("fitness");
  const [day, setDay] = useState("mon");
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("19:00");

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await submit(
          { action: "recurring", title: title.trim(), module, day, start, end },
          "Recurring item added",
        );
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Title" htmlFor="rc-title" className="col-span-2">
          <Input
            id="rc-title"
            required
            placeholder="e.g. Gym — push day"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <Field label="Belongs to" className="col-span-2">
          <Select value={module} onValueChange={setModule}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fitness">Fitness</SelectItem>
              <SelectItem value="wellness">Wellness</SelectItem>
              <SelectItem value="academics">Academics</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Day" className="col-span-2">
          <DaySelect value={day} onChange={setDay} />
        </Field>
        <Field label="Starts" htmlFor="rc-start">
          <Input
            id="rc-start"
            type="time"
            required
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </Field>
        <Field label="Ends" htmlFor="rc-end">
          <Input
            id="rc-end"
            type="time"
            required
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </Field>
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        Add recurring item
      </Button>
    </form>
  );
}

export function ScheduleEntryButtons({ courses }: { courses: string[] }) {
  return (
    <div className="flex gap-2">
      <EntryDialog title="Add a class time" triggerLabel="Add class time">
        <MeetingFormInner courses={courses} />
      </EntryDialog>
      <EntryDialog title="Add a recurring item" triggerLabel="Add recurring">
        <RecurringFormInner />
      </EntryDialog>
    </div>
  );
}
