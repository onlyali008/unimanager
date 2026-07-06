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

const KINDS = ["assignment", "exam", "quiz", "project", "reading"] as const;

function CourseFormInner() {
  const { submit, busy } = useEntrySubmit("academics");
  const [course, setCourse] = useState("");
  const [courseName, setCourseName] = useState("");
  const [term, setTerm] = useState("");
  const [credits, setCredits] = useState("3");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    await submit(
      {
        action: "course",
        course: course.trim(),
        course_name: courseName.trim(),
        term: term.trim(),
        credits: Number(credits),
      },
      "Course saved",
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Course code" htmlFor="ac-course">
          <Input
            id="ac-course"
            required
            placeholder="e.g. CS 201"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
          />
        </Field>
        <Field label="Credits" htmlFor="ac-credits">
          <Input
            id="ac-credits"
            type="number"
            min="0"
            step="0.5"
            required
            value={credits}
            onChange={(e) => setCredits(e.target.value)}
          />
        </Field>
        <Field label="Course name" htmlFor="ac-name" className="col-span-2">
          <Input
            id="ac-name"
            required
            placeholder="e.g. Data Structures"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
          />
        </Field>
        <Field
          label="Term"
          htmlFor="ac-term"
          className="col-span-2"
          hint='e.g. "2026-fall"'
        >
          <Input
            id="ac-term"
            required
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </Field>
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        Save course
      </Button>
    </form>
  );
}

function DeadlineFormInner({ courses }: { courses: string[] }) {
  const { submit, busy } = useEntrySubmit("academics");
  const [course, setCourse] = useState(courses[0] ?? "");
  const [title, setTitle] = useState("");
  const [due, setDue] = useState(todayISO());
  const [kind, setKind] = useState<string>("assignment");
  const [weight, setWeight] = useState("");

  if (courses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add a course first — deadlines live inside a course note.
      </p>
    );
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    await submit(
      {
        action: "deadline",
        course,
        title: title.trim(),
        due,
        kind,
        status: "todo",
        weight_pct: weight === "" ? null : Number(weight),
      },
      "Deadline added",
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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
        <Field label="Title" htmlFor="dl-title" className="col-span-2">
          <Input
            id="dl-title"
            required
            placeholder="e.g. Assignment 2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <Field label="Due date" htmlFor="dl-due">
          <Input
            id="dl-due"
            type="date"
            required
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </Field>
        <Field label="Kind">
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {k[0].toUpperCase() + k.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field
          label="Weight (%)"
          htmlFor="dl-weight"
          hint="Optional share of final grade."
          className="col-span-2"
        >
          <Input
            id="dl-weight"
            type="number"
            min="0"
            max="100"
            step="1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </Field>
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        Add deadline
      </Button>
    </form>
  );
}

export function AcademicsEntryButtons({ courses }: { courses: string[] }) {
  return (
    <div className="flex gap-2">
      <EntryDialog title="Add a course" triggerLabel="Add course">
        <CourseFormInner />
      </EntryDialog>
      <EntryDialog title="Add a deadline" triggerLabel="Add deadline">
        <DeadlineFormInner courses={courses} />
      </EntryDialog>
    </div>
  );
}
