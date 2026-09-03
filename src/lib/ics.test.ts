import { describe, it, expect } from "vitest";
import { detectCourses, detectTaskEvents, parseICS } from "./ics";

const SAMPLE = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:1
SUMMARY:CS 240 Algorithms
LOCATION:Building 5 Room 101
DTSTART;TZID=America/New_York:20260908T100000
DTEND;TZID=America/New_York:20260908T111500
RRULE:FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20261215T000000Z
END:VEVENT
BEGIN:VEVENT
UID:2
SUMMARY:CS 240 Algorithms
DTSTART;TZID=America/New_York:20260911T100000
DTEND;TZID=America/New_York:20260911T111500
RRULE:FREQ=WEEKLY;BYDAY=FR
END:VEVENT
BEGIN:VEVENT
UID:3
SUMMARY:HIST 118 Midterm Exam
DTSTART:20261010T130000
DTEND:20261010T143000
END:VEVENT
BEGIN:VEVENT
UID:4
SUMMARY:Coffee with advisor
DTSTART:20261012T090000
END:VEVENT
END:VCALENDAR`;

describe("parseICS", () => {
  it("reads every VEVENT with its summary", () => {
    const events = parseICS(SAMPLE);
    expect(events).toHaveLength(4);
    expect(events[0].summary).toBe("CS 240 Algorithms");
    expect(events[0].recurs).toBe(true);
    expect(events[0].weeklyDays).toEqual([1, 3]); // Mon, Wed
  });

  it("unfolds folded lines", () => {
    const folded = `BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:Very long course name that
  wraps across two lines
DTSTART:20260908T100000
RRULE:FREQ=WEEKLY;BYDAY=MO
END:VEVENT
END:VCALENDAR`;
    const events = parseICS(folded);
    expect(events[0].summary).toBe("Very long course name that wraps across two lines");
  });

  it("does not throw on garbage input", () => {
    expect(() => parseICS("not a calendar at all")).not.toThrow();
    expect(parseICS("not a calendar at all")).toEqual([]);
  });
});

describe("detectCourses", () => {
  it("merges recurring events with the same summary and unions their days", () => {
    const courses = detectCourses(parseICS(SAMPLE));
    expect(courses).toHaveLength(1);
    const cs = courses[0];
    expect(cs.code).toBe("CS 240");
    expect(cs.name).toBe("Algorithms");
    expect(cs.meetingDays).toEqual([1, 3, 5]); // Mon, Wed, Fri
    expect(cs.meetingStart).toBe("10:00");
    expect(cs.meetingEnd).toBe("11:15");
  });

  it("ignores non-recurring events", () => {
    const courses = detectCourses(
      parseICS(`BEGIN:VEVENT
SUMMARY:One-off meeting
DTSTART:20260908T100000
END:VEVENT`),
    );
    expect(courses).toHaveLength(0);
  });
});

describe("detectTaskEvents", () => {
  it("turns dated exam/assignment events into tasks", () => {
    const tasks = detectTaskEvents(parseICS(SAMPLE));
    expect(tasks).toHaveLength(1);
    expect(tasks[0].type).toBe("exam");
    expect(tasks[0].title).toBe("HIST 118 Midterm Exam");
  });

  it("skips unrelated one-off events", () => {
    const tasks = detectTaskEvents(parseICS(SAMPLE));
    expect(tasks.some((t) => t.title.includes("Coffee"))).toBe(false);
  });
});
