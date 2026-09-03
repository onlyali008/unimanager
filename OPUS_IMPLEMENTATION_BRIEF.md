# Semestra: implementation brief for Opus

## Audit scope and honest conclusion

This repository is an unmodified `create-next-app` scaffold. Semestra does not yet exist as an application: its only route renders the starter Next.js landing page. The production build, TypeScript check, and lint pass, but that only proves that the scaffold compiles.

Do **not** preserve the current UI as a design reference. Replace it.

## Verified issues

### Blocker: the product is absent

- There is no Semestra name, purpose, visual identity, or user-facing copy. `src/app/page.tsx` only contains the default Next/Vercel calls to action.
- There is no core workflow: no term creation, courses, assignments, events, study plans, calendar, task completion, priorities, grades, or overview.
- There is no data model, storage, API, database, import/export, authentication, authorization, or multi-user separation.
- There is no interaction state. The page is a server-rendered static starter with no usable product actions.
- There is no empty state, onboarding, seeded demo data, validation, error recovery, loading state, confirmation, undo, or notification system.

### Blocker: dependencies are vulnerable

`npm audit --omit=dev` reports 4 high-severity production dependency vulnerabilities. The direct dependency `next@16.2.10` is affected by multiple published advisories; its bundled `postcss` and `sharp` are affected too. The audit provides a non-breaking remediation path to `next@16.3.4`. `nanoid` is also vulnerable and should be updated through the lockfile resolution.

### Product quality and accessibility gaps

- The sole screen is irrelevant to a student and exposes outgoing template links rather than Semestra actions.
- No responsive product layout exists for desktop, tablet, or mobile.
- No semantic navigation, page landmarks, keyboard interaction model, focus management, skip link, form labels, validation messaging, live-region feedback, or reduced-motion treatment exists.
- No color system, typography scale, spacing scale, component states, contrast audit, or light/dark visual design exists. Dark mode merely applies the starter colors.
- `layout.tsx` loads Geist, while `globals.css` overrides the body with Arial/Helvetica, so the intended type system is internally inconsistent.
- Stock Next/Vercel assets remain in `public/`, and the default favicon remains. They make the project look unfinished and should be removed or replaced once unused.

### Reliability, security, and delivery gaps

- The document metadata is still `Create Next App`; it has no Semestra title template, description, canonical URL, Open Graph image, app icon, robots rules, sitemap, or social previews.
- There are no route-level `loading`, `error`, or `not-found` experiences.
- There are no automated unit, component, integration, accessibility, or end-to-end tests.
- There is no CI workflow to run lint, typecheck, tests, build, and dependency audit.
- The README is untouched scaffold documentation. It does not explain the product, setup, architecture, commands, data handling, or deployment.
- No deployment configuration, environment-variable example, monitoring/error reporting, analytics consent policy, backup policy, or security headers are present.
- The application currently has no persistence, which makes it unusable beyond a static visit. Any implementation must decide explicitly between local-first storage and an authenticated backend before shipping.

## Build this product

Build a polished, local-first semester planner called **Semestra**. Its job is to make a student's current workload immediately legible and turn courses, assignments, exams, and study sessions into an actionable daily plan. Start with a strong client-side product and persist all user data in browser storage. Do not add authentication, a remote database, or a paid third-party service unless a later request calls for them.

### Required experience

1. **Dashboard**
   - A calm overview with a greeting, current term selector, progress summary, next deadlines, today’s schedule, and a clearly prioritized task list.
   - Show meaningful seeded demo content on first visit, plus a clear reset/demo-data control.
   - Surface overdue work, due-today work, and the next upcoming deadline distinctly without relying on color alone.

2. **Courses**
   - Create, edit, archive, and delete courses. Each has a name, short code, instructor, color, meeting schedule, and optional target grade.
   - Display course workload and upcoming items.

3. **Tasks and assessments**
   - Create, edit, complete, reopen, and delete tasks.
   - Support assignment, exam, reading, project, and study-session types; course; due date/time; estimated duration; priority; notes; and weight where relevant.
   - Filter and sort by course, status, type, priority, and due date. Include search.
   - Make completion and deletion safe: confirm destructive deletion and offer a short undo for completion/deletion where practical.

4. **Calendar and planning**
   - Provide a usable week view and an agenda/list view. Render recurring course meetings, due dates, and study sessions.
   - Let a student schedule a study session from a task, then reflect its time estimate/progress in the dashboard.

5. **Progress and settings**
   - Show per-course and term-level workload/progress. Never present invented grade calculations as factual; explain inputs and assumptions.
   - Include theme preference, data export/import, reset, and an accessibility-friendly density choice if it remains small and clear.

## Engineering constraints

- Use Next.js App Router and TypeScript. Keep the scope local-first using a small, typed storage layer with schema versioning and graceful recovery from corrupt data.
- First update the lockfile and direct Next dependency to a non-vulnerable patched version, then run `npm audit --omit=dev`, lint, TypeScript, and production build. Do not claim the audit is clean unless it is.
- Create a clear structure: typed domain models, data/storage utilities, reusable UI components, and route/page components. Avoid putting the entire application in one `page.tsx` file.
- Use accessible native controls where possible. Every control must have an accessible name, visible keyboard focus, sensible tab order, adequate contrast, and form errors linked to the field. Respect `prefers-reduced-motion`.
- Make responsive behavior intentional: desktop supports a navigation rail and multi-column dashboard; narrow screens use a compact header and single-column content without horizontal scrolling.
- Build a cohesive visual system rather than a generic dashboard: warm off-white base, ink text, restrained course-color accents, generous spacing, information-dense but calm cards, and typographic hierarchy that makes deadlines scannable.
- Replace all starter branding, text, metadata, icon, and unused stock assets. Use the loaded Geist font consistently or remove it deliberately.
- Add `loading.tsx`, `error.tsx`, and `not-found.tsx` where meaningful. Add metadata, `robots.ts`, `sitemap.ts`, and a real README.
- Add at least focused tests for date/deadline sorting, filtering, storage migration/recovery, and one primary interactive flow. Add an automated accessibility check if practical.
- Do not fabricate integrations, real calendar synchronization, reminders, grade data, or claims of data security. Clearly label local storage and data-export behavior.

## Suggested implementation order

1. Upgrade dependencies and establish a passing quality baseline.
2. Create the typed domain model, sample dataset, local storage/migration layer, and data hooks.
3. Build the shell, responsive navigation, global styles, metadata, and accessible primitives.
4. Implement dashboard, courses, and task CRUD completely.
5. Implement calendar/planning and progress/settings.
6. Add empty, loading, error, confirmation, undo, and mobile states.
7. Add tests, documentation, CI, run audit/lint/typecheck/build, and fix all findings.

## Definition of done

Someone can open Semestra, understand its purpose in seconds, manage a realistic semester entirely in the browser, return after refresh without losing changes, use the critical flows with a keyboard, and see a polished responsive interface that contains no Next.js starter content. The repository passes lint, TypeScript, production build, tests, and a clean production dependency audit.
