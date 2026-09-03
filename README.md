# Semestra

A calm, local-first semester planner. Semestra turns your courses, assignments,
and exams into a clear, prioritized daily plan — and keeps everything in your
own browser. No account, no server, no upload.

## Features

- **Dashboard** — greeting, a live summary (overdue / due today / upcoming /
  completed), today's schedule, and tasks grouped by urgency.
- **Tasks** — create, edit, complete/reopen, delete. Types: assignment, exam,
  reading, project, study session. Each with course, due date/time, priority,
  estimate, and notes. Filter and search by status, course, type, and text.
  Safe deletion with undo.
- **Courses** — full CRUD with code, instructor, color, weekly meeting schedule,
  and an optional target grade. Each card shows its live workload and next
  deadline. Archive courses you're done with.
- **Calendar** — a week view and an agenda view that combine recurring class
  meetings, task due dates, and study sessions. Schedule a study session
  straight from any task; it lands on the calendar and dashboard.
- **Progress** — honest per-course and term-level task completion. Semestra does
  not invent grades; "target grade" is just a note you set.
- **Terms** — organize everything by term and switch between them.
- **Settings** — theme (system/light/dark), density, term management, and data
  export / import / reset.
- Keyboard-accessible, responsive (navigation rail on desktop, stacked on
  mobile), light/dark, and `prefers-reduced-motion` aware.

## Data & privacy

All data stays in your browser's `localStorage` under the `semestra.*` keys,
through a typed, schema-versioned storage layer that validates every record and
recovers gracefully from corrupt data (older v1 data is migrated automatically).
Export produces a plain JSON file you control; import replaces your current data
with a validated file.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — ESLint
- `npm test` — run the Vitest unit suite

## Architecture

```
src/
  app/
    page.tsx        Dashboard
    courses/        Course management
    calendar/       Week + agenda views
    progress/       Completion progress
    settings/       Appearance, terms, data
    layout.tsx      Root layout + metadata
    error / loading / not-found
    robots.ts, sitemap.ts
  components/       AppShell, TaskForm, TaskItem, CourseForm, ScheduleDialog
  hooks/
    useStore.ts     Reads store via useSyncExternalStore; all mutations
  lib/
    types.ts        Domain model (Task, Course, Term, Settings) + schema version
    storage.ts      Load/save, validation, v1→v2 migration, recovery
    store.ts        External store powering useSyncExternalStore
    tasks.ts        Sorting, filtering, bucketing, calendar, formatting
    seed.ts         First-run demo dataset
    *.test.ts       Vitest unit tests
```

## Testing & CI

`npm test` covers deadline bucketing, sorting, filtering/search, the summary and
calendar builders, and storage migration/validation/recovery. GitHub Actions
(`.github/workflows/ci.yml`) runs lint, typecheck, tests, build, and a
production dependency audit on every push and pull request.
