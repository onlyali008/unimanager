// A small, dependency-free iCalendar (.ics) reader focused on what a student
// timetable actually contains: recurring class meetings and dated one-off
// events. It is intentionally lenient — real exports vary — and it never
// throws on unexpected content, it just extracts what it can.

export interface ICSEvent {
  summary: string;
  location?: string;
  description?: string;
  start: Date | null;
  end: Date | null;
  dateOnly: boolean;
  /** Weekdays this event recurs on (0=Sun..6=Sat). Empty = not weekly. */
  weeklyDays: number[];
  recurs: boolean;
}

const BYDAY: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

/** Join RFC 5545 folded lines (continuations begin with a space or tab). */
function unfold(text: string): string[] {
  const rawLines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const lines: string[] = [];
  for (const line of rawLines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

interface ParsedLine {
  name: string;
  params: Record<string, string>;
  value: string;
}

function parseLine(line: string): ParsedLine | null {
  const colon = line.indexOf(":");
  if (colon === -1) return null;
  const head = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const parts = head.split(";");
  const name = parts[0].toUpperCase();
  const params: Record<string, string> = {};
  for (let i = 1; i < parts.length; i += 1) {
    const eq = parts[i].indexOf("=");
    if (eq !== -1) {
      params[parts[i].slice(0, eq).toUpperCase()] = parts[i].slice(eq + 1);
    }
  }
  return { name, params, value };
}

/**
 * Parse an ics datetime value into a local Date. Class times are wall-clock
 * local, so we build the date from the literal components rather than
 * converting time zones (which a static app can't do reliably anyway).
 */
function parseDateValue(value: string): { date: Date | null; dateOnly: boolean } {
  const v = value.trim();
  const dateOnlyMatch = /^(\d{4})(\d{2})(\d{2})$/.exec(v);
  if (dateOnlyMatch) {
    const [, y, m, d] = dateOnlyMatch;
    return {
      date: new Date(Number(y), Number(m) - 1, Number(d)),
      dateOnly: true,
    };
  }
  const dtMatch = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/.exec(v);
  if (dtMatch) {
    const [, y, m, d, hh, mm, ss, z] = dtMatch;
    if (z) {
      // UTC instant; convert to the viewer's local wall clock.
      return {
        date: new Date(
          Date.UTC(
            Number(y),
            Number(m) - 1,
            Number(d),
            Number(hh),
            Number(mm),
            Number(ss),
          ),
        ),
        dateOnly: false,
      };
    }
    return {
      date: new Date(
        Number(y),
        Number(m) - 1,
        Number(d),
        Number(hh),
        Number(mm),
        Number(ss),
      ),
      dateOnly: false,
    };
  }
  return { date: null, dateOnly: false };
}

function unescapeText(v: string): string {
  return v
    .replace(/\\n/gi, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

export function parseICS(text: string): ICSEvent[] {
  const lines = unfold(text);
  const events: ICSEvent[] = [];
  let current: Partial<ICSEvent> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "BEGIN:VEVENT") {
      current = { weeklyDays: [], recurs: false, dateOnly: false };
      continue;
    }
    if (trimmed === "END:VEVENT") {
      if (current && current.summary) {
        events.push({
          summary: current.summary,
          location: current.location,
          description: current.description,
          start: current.start ?? null,
          end: current.end ?? null,
          dateOnly: current.dateOnly ?? false,
          weeklyDays: current.weeklyDays ?? [],
          recurs: current.recurs ?? false,
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const parsed = parseLine(line);
    if (!parsed) continue;

    switch (parsed.name) {
      case "SUMMARY":
        current.summary = unescapeText(parsed.value);
        break;
      case "LOCATION":
        current.location = unescapeText(parsed.value);
        break;
      case "DESCRIPTION":
        current.description = unescapeText(parsed.value);
        break;
      case "DTSTART": {
        const { date, dateOnly } = parseDateValue(parsed.value);
        current.start = date;
        current.dateOnly = dateOnly;
        break;
      }
      case "DTEND": {
        const { date } = parseDateValue(parsed.value);
        current.end = date;
        break;
      }
      case "RRULE": {
        const rule = parsed.value.toUpperCase();
        if (/FREQ=WEEKLY/.test(rule)) {
          current.recurs = true;
          const byday = /BYDAY=([^;]+)/.exec(rule);
          if (byday) {
            current.weeklyDays = byday[1]
              .split(",")
              .map((d) => BYDAY[d.trim().slice(-2)])
              .filter((n): n is number => n !== undefined);
          }
        } else if (/FREQ=/.test(rule)) {
          current.recurs = true;
        }
        break;
      }
      default:
        break;
    }
  }

  return events;
}

/* --- Course & task detection -------------------------------------- */

export interface DetectedCourse {
  name: string;
  code: string;
  location?: string;
  meetingDays: number[];
  meetingStart?: string;
  meetingEnd?: string;
}

export interface DetectedTaskEvent {
  title: string;
  dueAt: string;
  type: "assignment" | "exam";
}

function hhmm(date: Date | null): string | undefined {
  if (!date) return undefined;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Split "CS 240 Algorithms" into a code and a human name. */
function splitCodeName(summary: string): { code: string; name: string } {
  const m = /^([A-Za-z]{2,}[\s-]?\d{2,}[A-Za-z]?)\s*[:—-]?\s*(.*)$/.exec(
    summary.trim(),
  );
  if (m) {
    const code = m[1].replace(/\s+/g, " ").trim();
    const name = m[2].trim() || summary.trim();
    return { code, name };
  }
  return { code: "", name: summary.trim() };
}

function normalizeKey(summary: string): string {
  return summary.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Group recurring weekly events into courses, merging meeting days. */
export function detectCourses(events: ICSEvent[]): DetectedCourse[] {
  const map = new Map<string, DetectedCourse & { _days: Set<number> }>();

  for (const ev of events) {
    if (!ev.recurs) continue;
    if (!ev.summary) continue;
    const key = normalizeKey(ev.summary);
    const days = ev.weeklyDays.length
      ? ev.weeklyDays
      : ev.start
        ? [ev.start.getDay()]
        : [];

    const existing = map.get(key);
    if (existing) {
      for (const d of days) existing._days.add(d);
      if (!existing.meetingStart) existing.meetingStart = hhmm(ev.start);
      if (!existing.meetingEnd) existing.meetingEnd = hhmm(ev.end);
    } else {
      const { code, name } = splitCodeName(ev.summary);
      map.set(key, {
        code,
        name,
        location: ev.location,
        meetingDays: [],
        meetingStart: hhmm(ev.start),
        meetingEnd: hhmm(ev.end),
        _days: new Set(days),
      });
    }
  }

  return [...map.values()].map(({ _days, ...course }) => ({
    ...course,
    meetingDays: [..._days].sort((a, b) => a - b),
  }));
}

/** Turn dated, non-recurring events into candidate tasks. */
export function detectTaskEvents(events: ICSEvent[]): DetectedTaskEvent[] {
  const out: DetectedTaskEvent[] = [];
  for (const ev of events) {
    if (ev.recurs) continue;
    if (!ev.start) continue;
    const isExam = /\b(exam|final|midterm|quiz|test)\b/i.test(ev.summary);
    const looksLikeWork =
      isExam ||
      /\b(assign|homework|hw|project|paper|essay|due|deadline|submission)\b/i.test(
        ev.summary,
      );
    if (!looksLikeWork) continue;
    out.push({
      title: ev.summary,
      dueAt: ev.start.toISOString(),
      type: isExam ? "exam" : "assignment",
    });
  }
  return out;
}
