# Semestra

A calm, local-first semester planner. Semestra turns your courses, assignments,
exams, and study time into a clear daily plan — and keeps everything in your own
browser. No account, no server, no upload.

## Features

- **Dashboard** — greeting, a live summary (overdue / due today / upcoming /
  completed), a **"Focus now"** recommendation of your most pressing tasks,
  **exam countdowns**, today's schedule with estimated workload, and **inline
  quick-add** (type a title, press Enter).
- **Tasks** — create, edit, complete/reopen, delete. Types for assignment,
  exam, reading, project, and study session, each with course, due date/time,
  priority, estimate, and notes. Filter and search; safe delete with undo.
- **Courses** — full CRUD with code, instructor, color, weekly meeting schedule.
  Each course has a detail page with:
  - **Grades** — weighted categories, a per-course percentage→letter scale
    (from your syllabus), a current letter grade + **4.0 GPA**, and "what you
    need on the rest to hit your target."
  - **Syllabus upload** (stored locally in your browser).
  - **Artifacts** — notes, live-dictation transcripts, and audio **lecture
    recordings**, each opened in an editable panel (markdown preview included).
- **Calendar** — interactive **week** and **agenda** views combining class
  meetings, deadlines, and study sessions. Click a task to edit, tick it done,
  or click a day to add one. Import your timetable from an **`.ics` file** and
  Semestra detects your courses automatically.
- **Study timer** — a Pomodoro timer that survives navigation and page reloads,
  alerts you (chime, notification, title flash) when a block ends, and logs
  focus time to a task. **Focus streaks** and weekly totals on Progress.
- **Progress** — term GPA (4.0), each course's current grade, task completion,
  and your study-focus streak.
- **Assistant** — a chat grounded in your schedule, powered by a local **Ollama**
  model (private, offline). Configurable in Settings.
- **Terms**, **theme** (system/light/dark), **density**, full **JSON backup**
  (audio recordings included), and **keyboard shortcuts** (press `?`).
- Keyboard-accessible, responsive (sidebar rail on desktop, bottom tab bar on
  mobile), and `prefers-reduced-motion` aware.

## Data & privacy

Everything is stored in your browser: the plan in `localStorage`, and audio /
syllabus files in IndexedDB. Nothing is uploaded. A typed, schema-versioned
storage layer validates every record and migrates older data automatically.
Export produces a single JSON file you control (with recordings embedded);
import previews the change and replaces your data only after you confirm.

## The assistant (optional)

The assistant talks to a local [Ollama](https://ollama.com) server from your
browser, so it needs to be allowed to reach it:

```bash
ollama pull llama3.2:1b
OLLAMA_ORIGINS=http://localhost:3000 ollama serve
```

Then set the URL/model in **Settings → AI assistant** (default `llama3.2:1b`).

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — dev server
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — ESLint
- `npm test` — Vitest unit suite

## Architecture

```
src/
  app/            Routes: dashboard, courses, courses/[id], calendar, timer,
                  progress, assistant, settings, + error/loading/not-found,
                  robots.ts, sitemap.ts
  components/     AppShell, TaskForm, TaskItem, CourseForm, CourseGrades,
                  ImportDialog, ArtifactViewer, AudioRecorder, ScheduleDialog,
                  TimerWidget, GlobalShortcuts
  hooks/          useStore, useTimer, useDictation, useIsClient
  lib/
    types.ts      Domain model + schema version
    storage.ts    Load/save, validation, migration, recovery
    store.ts      External store (useSyncExternalStore)
    tasks.ts      Sorting, filtering, buckets, calendar, recommendations
    grades.ts     Weighted grades, letters, GPA
    focus.ts      Study-focus streaks/totals
    ics.ts        Calendar (.ics) parsing + course detection
    assistant.ts  Ollama streaming + schedule context
    timerStore.ts Pomodoro timer singleton
    audioStore.ts / fileStore.ts   IndexedDB blob stores
    backup.ts     Full export/import (incl. audio)
    markdown.ts   Safe minimal markdown renderer
    *.test.ts     Vitest unit tests
```

## Deploy

Semestra is a fully client-rendered, local-first app, so `npm run build`
produces a **static site** in `out/` that can be hosted anywhere — no server
required.

- **Netlify / Vercel / any static host:** build and serve `out/` at the root.
- **GitHub Pages:** push to `local-first-planner` with Pages set to the
  "GitHub Actions" source; `.github/workflows/pages.yml` builds with
  `NEXT_PUBLIC_BASE_PATH=/<repo>` and publishes automatically. (For a sub-path
  host, set `NEXT_PUBLIC_BASE_PATH` to your repo name at build time.)
- **Locally preview the export:** `npm run build && npx serve out`.

Because everything is local-first, there are no environment variables or
secrets to configure. The only optional integration is a **local Ollama**
server for the assistant, which runs on the student's own machine.

## Privacy

Semestra stores everything in your browser — tasks and courses in
`localStorage`, audio recordings and syllabus files in IndexedDB. Nothing is
uploaded to any server. Your data lives on the device you use it on; export a
JSON backup from Settings to move it or keep it safe. Clearing your browser's
site data removes it.

## Testing & CI

`npm test` covers deadline bucketing/sorting/filtering, recommendations,
calendar building, `.ics` parsing/detection, storage migration/validation,
grade math, focus streaks, and the markdown renderer. GitHub Actions
(`.github/workflows/ci.yml`) runs lint, typecheck, tests, build, and a
production dependency audit on every push and pull request.
