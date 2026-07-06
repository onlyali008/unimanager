"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/forms/field";
import type { DayBlock, WeeklyBlock } from "@/lib/schedule";
import { minutesOf } from "@/lib/schedule";
import { cn } from "@/lib/utils";

const MODULE_CLASSES: Record<WeeklyBlock["module"], string> = {
  academics: "bg-academics/10 text-academics",
  fitness: "bg-fitness/10 text-fitness",
  wellness: "bg-wellness/10 text-wellness",
  other: "bg-muted text-muted-foreground",
};

const DAYS = [
  ["mon", "Monday"],
  ["tue", "Tuesday"],
  ["wed", "Wednesday"],
  ["thu", "Thursday"],
  ["fri", "Friday"],
  ["sat", "Saturday"],
  ["sun", "Sunday"],
] as const;

/** Edit/delete dialog shared by the weekly rhythm chips and day planner. */
function EditBlockDialog({
  block,
  children,
}: {
  block: WeeklyBlock;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isMeeting = block.source.kind === "meeting";
  const [title, setTitle] = useState(block.title);
  const [module, setModule] = useState<string>(block.module);
  const [day, setDay] = useState<string>(block.day);
  const [start, setStart] = useState(block.start);
  const [end, setEnd] = useState(block.end);
  const [location, setLocation] = useState(block.location ?? "");

  async function post(payload: unknown, message: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
      toast.success(message);
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (block.source.kind === "meeting") {
      void post(
        {
          action: "update-meeting",
          course: block.source.course,
          index: block.source.index,
          day,
          start,
          end,
          location: location.trim() || null,
        },
        "Class time updated",
      );
    } else {
      void post(
        {
          action: "update-recurring",
          index: block.source.index,
          title: title.trim(),
          module,
          day,
          start,
          end,
        },
        "Block updated",
      );
    }
  }

  function remove() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    void post(
      block.source.kind === "meeting"
        ? {
            action: "delete-meeting",
            course: block.source.course,
            index: block.source.index,
          }
        : { action: "delete-recurring", index: block.source.index },
      "Block removed",
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setConfirmDelete(false);
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {isMeeting ? `Edit class time — ${block.title}` : "Edit block"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {!isMeeting ? (
              <>
                <Field label="Title" htmlFor="eb-title" className="col-span-2">
                  <Input
                    id="eb-title"
                    required
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
              </>
            ) : null}
            <Field label="Day" className="col-span-2">
              <Select value={day} onValueChange={setDay}>
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
            </Field>
            <Field label="Starts" htmlFor="eb-start">
              <Input
                id="eb-start"
                type="time"
                required
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </Field>
            <Field label="Ends" htmlFor="eb-end">
              <Input
                id="eb-end"
                type="time"
                required
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </Field>
            {isMeeting ? (
              <Field label="Location" htmlFor="eb-loc" className="col-span-2">
                <Input
                  id="eb-loc"
                  placeholder="optional"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </Field>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Save
            </Button>
            <Button
              type="button"
              variant={confirmDelete ? "destructive" : "outline"}
              onClick={remove}
              disabled={busy}
            >
              <Trash2 className="size-4" />
              {confirmDelete ? "Really delete?" : "Delete"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Clickable chip used in the weekly rhythm columns. */
export function BlockChip({
  block,
  conflicted,
}: {
  block: WeeklyBlock;
  conflicted: boolean;
}) {
  return (
    <EditBlockDialog block={block}>
      <button
        type="button"
        title={block.location ? `${block.title} @ ${block.location}` : block.title}
        className={cn(
          "w-full rounded-md px-2 py-1.5 text-left text-xs transition-opacity hover:opacity-80",
          MODULE_CLASSES[block.module],
          conflicted && "ring-2 ring-destructive/60",
        )}
      >
        <p className="truncate font-medium">{block.title}</p>
        <p className="font-mono text-[11px] opacity-80">
          {block.start}–{block.end}
        </p>
      </button>
    </EditBlockDialog>
  );
}

const DAY_MINUTES = 24 * 60;
const HOUR_PX = 44;
const DAY_HEIGHT = 24 * HOUR_PX;

/** The 00:00–23:59 day planner timeline. Blocks open the edit dialog. */
export function DayTimeline({
  blocks,
  nowMinutes,
}: {
  blocks: DayBlock[];
  /** Minutes since midnight when the shown day is today; null otherwise. */
  nowMinutes: number | null;
}) {
  return (
    <div className="flex gap-2">
      <div className="relative w-10 shrink-0" style={{ height: DAY_HEIGHT }}>
        {Array.from({ length: 24 }, (_, hour) => (
          <span
            key={hour}
            className="absolute right-1 -translate-y-1/2 font-mono text-[10px] text-muted-foreground"
            style={{ top: hour * HOUR_PX }}
          >
            {String(hour).padStart(2, "0")}:00
          </span>
        ))}
      </div>
      <div
        className="relative flex-1 overflow-hidden rounded-lg border"
        style={{ height: DAY_HEIGHT }}
      >
        {Array.from({ length: 24 }, (_, hour) => (
          <div
            key={hour}
            className="absolute inset-x-0 border-t border-border/60"
            style={{ top: hour * HOUR_PX }}
          />
        ))}
        {nowMinutes !== null ? (
          <div
            className="absolute inset-x-0 z-20 border-t-2 border-destructive/70"
            style={{ top: (nowMinutes / DAY_MINUTES) * DAY_HEIGHT }}
          />
        ) : null}
        {blocks.map((block, i) => {
          const top = (minutesOf(block.start) / DAY_MINUTES) * DAY_HEIGHT;
          const height = Math.max(
            22,
            ((minutesOf(block.end) - minutesOf(block.start)) / DAY_MINUTES) *
              DAY_HEIGHT,
          );
          return (
            <div
              key={i}
              className="absolute z-10 p-0.5"
              style={{
                top,
                height,
                left: `${(block.lane / block.lanes) * 100}%`,
                width: `${100 / block.lanes}%`,
              }}
            >
              <EditBlockDialog block={block}>
                <button
                  type="button"
                  className={cn(
                    "h-full w-full overflow-hidden rounded-md px-2 py-1 text-left text-xs transition-opacity hover:opacity-80",
                    MODULE_CLASSES[block.module],
                  )}
                >
                  <p className="truncate font-medium">{block.title}</p>
                  <p className="truncate font-mono text-[11px] opacity-80">
                    {block.start}–{block.end}
                    {block.location ? ` · ${block.location}` : ""}
                  </p>
                </button>
              </EditBlockDialog>
            </div>
          );
        })}
        {blocks.length === 0 ? (
          <p className="absolute inset-x-0 top-[40%] text-center text-sm text-muted-foreground">
            Nothing scheduled this day.
          </p>
        ) : null}
      </div>
    </div>
  );
}
