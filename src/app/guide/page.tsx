import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Guide",
  description: "Learn every feature of Semestra.",
};

const SECTIONS: { id: string; title: string }[] = [
  { id: "basics", title: "The basics" },
  { id: "dashboard", title: "Dashboard" },
  { id: "quick-add", title: "Quick add" },
  { id: "tasks", title: "Tasks" },
  { id: "courses", title: "Courses" },
  { id: "grades", title: "Grades & GPA" },
  { id: "materials", title: "Course materials" },
  { id: "calendar", title: "Calendar" },
  { id: "timer", title: "Study timer" },
  { id: "progress", title: "Progress" },
  { id: "assistant", title: "Assistant" },
  { id: "reminders", title: "Reminders" },
  { id: "shortcuts", title: "Keyboard shortcuts" },
  { id: "terms", title: "Terms" },
  { id: "settings", title: "Settings & backup" },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="kbd guide-kbd">{children}</kbd>;
}

export default function GuidePage() {
  return (
    <div className="page guide">
      <header className="page-header">
        <div>
          <p className="eyebrow">Guide</p>
          <h1 className="page-title">How Semestra works</h1>
          <p className="page-subtitle">
            A quick tour of every feature. Nothing here leaves your device.
          </p>
        </div>
        <Link href="/" className="btn btn-primary">
          Back to dashboard
        </Link>
      </header>

      <nav className="guide-toc card" aria-label="Contents">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="guide-toc-link">
            {s.title}
          </a>
        ))}
      </nav>

      <section id="basics" className="card guide-section">
        <h2 className="group-title">The basics</h2>
        <p>
          Semestra is a <strong>local-first</strong> planner. All your data —
          tasks, courses, grades, notes, recordings — lives in your browser on
          this device. There&apos;s no account and nothing is uploaded. Move
          between sections using the sidebar (or the bar at the bottom on
          phones). Back up or move your data anytime from{" "}
          <Link href="/settings" className="course-name-link">
            Settings
          </Link>
          .
        </p>
      </section>

      <section id="dashboard" className="card guide-section">
        <h2 className="group-title">Dashboard</h2>
        <ul className="guide-list">
          <li>
            <strong>Summary</strong> — counts of overdue, due-today, upcoming,
            and completed work.
          </li>
          <li>
            <strong>Focus now</strong> — the 1–3 most pressing tasks, ranked by
            urgency and priority. Hit <em>Start timer</em> to work on one, or
            mark it done.
          </li>
          <li>
            <strong>Exams ahead</strong> — a countdown to each upcoming exam.
          </li>
          <li>
            <strong>Today&apos;s schedule</strong> — class meetings and items
            due today, with your estimated workload.
          </li>
          <li>
            <strong>Task list</strong> — grouped by Overdue / Due today /
            Upcoming / No date, with search and filters.
          </li>
        </ul>
      </section>

      <section id="quick-add" className="card guide-section">
        <h2 className="group-title">Quick add</h2>
        <p>
          The box at the top of the dashboard understands plain English. Type a
          task and press <Kbd>Enter</Kbd>. A preview shows how it&apos;ll be
          interpreted before you commit.
        </p>
        <p className="guide-example">Essay due fri 5pm #CS240 !high ~2h</p>
        <ul className="guide-list">
          <li>
            <strong>Dates:</strong> today, tomorrow, a weekday (fri), “next
            week”, “in 3 days”, “Sep 20”, or “9/20”.
          </li>
          <li>
            <strong>Times:</strong> 5pm, 5:30pm, 17:00, noon, midnight.
          </li>
          <li>
            <strong>Course:</strong> <code>#CS240</code> or just a course code
            you&apos;ve created.
          </li>
          <li>
            <strong>Priority:</strong> <code>!high</code>, <code>!med</code>,{" "}
            <code>!low</code>.
          </li>
          <li>
            <strong>Estimate:</strong> <code>~2h</code> or <code>~90m</code>.
          </li>
          <li>
            <strong>Type</strong> is inferred from words like “exam”, “reading”,
            or “project”.
          </li>
        </ul>
        <p className="muted-note">
          Need every field? Use <em>More options</em> for the full form.
        </p>
      </section>

      <section id="tasks" className="card guide-section">
        <h2 className="group-title">Tasks</h2>
        <ul className="guide-list">
          <li>
            Create, edit, complete/reopen, and delete tasks. Deletes offer a
            quick <strong>undo</strong>.
          </li>
          <li>
            Types: assignment, exam, reading, project, study session — each with
            a course, due date/time, priority, estimate, and notes.
          </li>
          <li>
            <strong>Recurring:</strong> set a task to repeat daily, weekly, every
            two weeks, or monthly (with an optional end date). Completing one
            occurrence creates the next automatically.
          </li>
          <li>
            <strong>Checklists:</strong> break a task into subtasks. The row
            shows progress (✓ 2/5) and you can tick items off inline.
          </li>
          <li>
            <strong>Study sessions:</strong> the <em>Study</em> button on a task
            schedules a session on your calendar.
          </li>
        </ul>
      </section>

      <section id="courses" className="card guide-section">
        <h2 className="group-title">Courses</h2>
        <p>
          Add each course with a code, instructor, color, and weekly meeting
          schedule (used to fill your calendar). Archive courses you&apos;re
          done with, or delete them. Click a course name to open its detail
          page, where grades and materials live.
        </p>
      </section>

      <section id="grades" className="card guide-section">
        <h2 className="group-title">Grades &amp; GPA</h2>
        <ul className="guide-list">
          <li>
            On a course page, add weighted <strong>categories</strong> (e.g.
            Homework 20%, Midterm 30%, Final 50%) and enter scores as you get
            them. Semestra shows your current weighted grade, letter, and GPA
            points.
          </li>
          <li>
            Set a <strong>target %</strong> and it tells you what you need on the
            remaining work to hit it.
          </li>
          <li>
            <strong>Grading scale:</strong> adjust the percentage→letter bands to
            match your syllabus.
          </li>
          <li>
            <strong>Syllabus:</strong> upload it, then use{" "}
            <em>Read uploaded syllabus</em> to auto-detect the weighted
            categories from the file (PDF or text) — or paste the grading text.
          </li>
          <li>
            <Link href="/progress" className="course-name-link">
              Progress
            </Link>{" "}
            rolls everything into a term <strong>GPA (4.0)</strong>, weighted by
            credits.
          </li>
        </ul>
      </section>

      <section id="materials" className="card guide-section">
        <h2 className="group-title">Course materials</h2>
        <p>
          Each course page has <strong>Artifacts</strong> — self-contained notes
          you open in a panel:
        </p>
        <ul className="guide-list">
          <li>
            <strong>Notes</strong> with markdown (headings, bold, lists, links)
            and a live preview.
          </li>
          <li>
            <strong>Recordings</strong> — record a lecture with the built-in
            audio recorder and play it back later.
          </li>
          <li>
            <strong>Transcripts</strong> — live dictation turns speech into text
            as you talk (Chrome/Edge).
          </li>
        </ul>
      </section>

      <section id="calendar" className="card guide-section">
        <h2 className="group-title">Calendar</h2>
        <ul className="guide-list">
          <li>
            Switch between <strong>Week</strong>, <strong>Month</strong>, and{" "}
            <strong>Agenda</strong> views. Class meetings, deadlines, and study
            sessions all appear together.
          </li>
          <li>
            <strong>Import a timetable:</strong> on the Courses page, use{" "}
            <em>Import from calendar</em> with an <code>.ics</code> file
            (exported from Google Calendar, Outlook, or your school portal) and
            Semestra detects your courses automatically.
          </li>
          <li>
            <strong>Reschedule:</strong> drag a task to another day, or focus it
            and press <Kbd>←</Kbd> / <Kbd>→</Kbd> (± a day) or <Kbd>↑</Kbd> /{" "}
            <Kbd>↓</Kbd> (± a week).
          </li>
          <li>
            Click a day&apos;s <strong>+</strong> to add a task due then, or{" "}
            <strong>Print</strong> for a clean paper/PDF plan.
          </li>
        </ul>
      </section>

      <section id="timer" className="card guide-section">
        <h2 className="group-title">Study timer</h2>
        <p>
          A Pomodoro-style timer with focus/break blocks. Pick a task to log time
          against, and when a block ends you get a chime, a notification, and a
          title flash. It keeps running as you move between pages and survives a
          reload. Focused time feeds your streak on{" "}
          <Link href="/progress" className="course-name-link">
            Progress
          </Link>
          .
        </p>
      </section>

      <section id="progress" className="card guide-section">
        <h2 className="group-title">Progress</h2>
        <p>
          Your <strong>study-focus streak</strong> and weekly total, term{" "}
          <strong>GPA</strong>, each course&apos;s current grade, and task
          completion — all in one place.
        </p>
      </section>

      <section id="assistant" className="card guide-section">
        <h2 className="group-title">Assistant</h2>
        <p>
          Ask about your schedule — “what&apos;s due this week”, “when&apos;s my
          next exam”, “what should I work on”. It answers straight from your data
          with <strong>no setup required</strong>. For open-ended chat, you can
          connect a local{" "}
          <a
            href="https://ollama.com"
            target="_blank"
            rel="noopener noreferrer"
            className="course-name-link"
          >
            Ollama
          </a>{" "}
          model in Settings (it runs privately on your machine).
        </p>
      </section>

      <section id="reminders" className="card guide-section">
        <h2 className="group-title">Reminders</h2>
        <p>
          With Semestra open in a tab, it can fire a browser notification about
          30 minutes before a task is due. Turn it on and grant permission in{" "}
          <Link href="/settings" className="course-name-link">
            Settings → Reminders
          </Link>
          .
        </p>
      </section>

      <section id="shortcuts" className="card guide-section">
        <h2 className="group-title">Keyboard shortcuts</h2>
        <p>
          Press <Kbd>?</Kbd> anywhere for the full list. Highlights:
        </p>
        <ul className="guide-list">
          <li>
            <Kbd>g</Kbd> then <Kbd>d</Kbd>/<Kbd>c</Kbd>/<Kbd>k</Kbd>/<Kbd>t</Kbd>/
            <Kbd>p</Kbd>/<Kbd>a</Kbd>/<Kbd>s</Kbd> — jump to a section.
          </li>
          <li>
            <Kbd>n</Kbd> — new task, <Kbd>/</Kbd> — focus search (on the
            dashboard).
          </li>
        </ul>
      </section>

      <section id="terms" className="card guide-section">
        <h2 className="group-title">Terms</h2>
        <p>
          Organize everything by term. Switch the active term from the sidebar,
          and add new terms in{" "}
          <Link href="/settings" className="course-name-link">
            Settings
          </Link>
          . Each course and task belongs to a term.
        </p>
      </section>

      <section id="settings" className="card guide-section">
        <h2 className="group-title">Settings &amp; backup</h2>
        <ul className="guide-list">
          <li>
            <strong>Appearance</strong> — theme (system/light/dark) and density.
          </li>
          <li>
            <strong>Backup</strong> — export a single JSON file (recordings
            included) and import it on any device. Import previews the change
            before replacing your data.
          </li>
          <li>
            <strong>Sample data</strong> — load examples to explore, or{" "}
            <strong>Clear all</strong> / start fresh when you&apos;re ready.
          </li>
        </ul>
        <p className="muted-note">
          That&apos;s everything. Head back to the{" "}
          <Link href="/" className="course-name-link">
            dashboard
          </Link>{" "}
          and add your first course or task.
        </p>
      </section>
    </div>
  );
}
