# Semestra design system

Generated with the UI/UX Pro Max design-system method (three-layer tokens:
primitive → semantic → component), implemented in Tailwind CSS v4's
CSS-first syntax on top of shadcn/ui. Single source of truth:
`src/app/globals.css`. **Never hardcode colors, radii, or font families in
components — always go through a token utility.**

## Personality

Calm, focused, organized — a study companion for a university student. It
should lower stress, not gamify. Generous whitespace, soft contrast
surfaces, one quiet accent per domain, no loud gradients or badges
screaming for attention.

## Color

### Neutrals ("paper & ink")

Cool slate ramp (oklch, hue ≈ 250–265, low chroma). Light mode: near-white
slate background `--background`, white cards, slate-900 ink. Dark mode:
deep navy-slate `oklch(0.16 0.02 265)` — never pure black — with lifted
cards and low-opacity borders.

### Primary

Desaturated indigo (`--primary`, hue 272) — the "focus" color. Used for
the wordmark block, active states, rings, and primary buttons. Hover
surfaces (`--accent`) are an indigo-tinted wash of the background, so
interaction always feels like the same family.

### Domain accents

Six first-class tokens, one per life domain, equalized in lightness and
chroma so dashboards read as one system:

| Domain | Token | Tailwind utility | Hue |
| --- | --- | --- | --- |
| Nutrition | `--domain-nutrition` | `text-nutrition` / `bg-nutrition` | green 152 |
| Fitness | `--domain-fitness` | `text-fitness` / `bg-fitness` | orange 45 |
| Sleep | `--domain-sleep` | `text-sleep` / `bg-sleep` | violet 295 |
| Wellness | `--domain-wellness` | `text-wellness` / `bg-wellness` | rose 12 |
| Academics | `--domain-academics` | `text-academics` / `bg-academics` | blue 245 |
| Finances | `--domain-finances` | `text-finances` / `bg-finances` | gold 85 |

Rules:

- A domain color marks **identity, not decoration**: sidebar icon, page
  icon chip, that domain's chart series. Never use a domain color for an
  unrelated element.
- Use tints for surfaces (`bg-nutrition/10`), full strength only for
  icons, dots, and chart strokes. Body text stays ink/muted — domain
  colors are not text colors for paragraphs.
- Chart tokens `--chart-1..5` alias domain tokens. Single-domain charts
  use that domain's color; cross-domain charts get one color per domain.

## Typography

- **UI/body**: Geist Sans (`font-sans`) — everything by default.
- **Headings**: Lora serif (`font-heading`) — `h1`–`h3` get it via base
  styles; it gives the quiet "notebook" voice. Don't use it below
  card-title size.
- **Numbers/paths**: Geist Mono (`font-mono`) for vault paths, dates in
  tables, and stat values where alignment matters.
- Scale: page title `text-2xl font-semibold tracking-tight`, card title
  `text-base`, body `text-sm`, captions `text-xs text-muted-foreground`.

## Spacing, radius, elevation

- 4px spacing base (Tailwind default). Page gutter `p-4 md:p-6 lg:p-8`,
  card grids `gap-4`, content max-width `max-w-5xl` (forms `max-w-3xl`),
  centered.
- Radius: `--radius: 0.625rem`; cards/chips `rounded-xl`/`rounded-lg`.
- Elevation: borders over shadows. Hover = border tint or accent wash,
  not a bigger shadow.

## Component patterns

- **Sidebar**: shadcn sidebar, `collapsible="icon"`, groups **Track**
  (six domains, icons tinted with domain color) and **Plan**
  (Schedule, Assistant). Active item = sidebar-accent wash.
- **Page layout**: every page starts with `<PageHeader>` (serif title +
  one-line muted description). One idea per card.
- **Stat cards** (Phase 1): label `text-xs text-muted-foreground`, value
  `text-2xl font-semibold font-mono`, optional domain icon chip
  (`bg-{domain}/10 text-{domain}`).
- **Forms** (Phase 1): single column, labels above inputs, `max-w-3xl`,
  one primary button per view; validation messages in `--destructive`.
- **Charts** (Phase 1): recharts, stroke = domain token via
  `var(--domain-x)`, grid lines `--border`, no 3D/gradients; 30-day
  trends default. Read the `dataviz` skill before building chart
  components.
- **Empty states**: icon chip + short sentence + the vault path it will
  read (`font-mono text-xs`) — see `PlaceholderPage`.

## Dark mode

`next-themes` with class strategy; all tokens have `.dark` overrides
(domain accents lightened ~0.1 L). Components must only reference
semantic utilities so theme switching is automatic.
