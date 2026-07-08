# Semestra design system

Generated with the UI/UX Pro Max design-system method (three-layer tokens:
primitive → semantic → component), implemented in Tailwind CSS v4's
CSS-first syntax on top of shadcn/ui. Single source of truth:
`src/app/globals.css`. **Never hardcode colors, radii, or font families in
components — always go through a token utility.**

## Personality — "Editorial Brutalist"

A modern-brutalist study desk. Raw structure and confident type, but
refined — rules and whitespace do the work, not heavy boxes. Sharp
corners, high contrast, mono for data, one acid-lime marker. It should
read like a well-set magazine, not a neo-brutalist template: editorial,
fast, and deliberately *not* generic. No soft shadows, no gradients, no
rounded chrome.

## Color

### Neutrals ("bone & ink")

Warm low-chroma ramp (oklch, hue ≈ 72–86). Light mode: warm bone paper
`--background`, slightly lighter bone cards, graphite ink `--foreground`.
Dark mode: warm near-black stock (never pure black), lifted cards, and
low-opacity hairline borders. Borders are kept **light** on purpose so
rules read as lines, not cages.

### Primary — acid lime

A single accent, `--primary` (oklch hue ≈ 121, high chroma). Ink text
always sits on top of it (`--primary-foreground`). Use it as a **marker**,
not wallpaper: the logo block, the active-nav inset bar, primary CTA
buttons, focus rings, text selection, and the `.mark` highlighter swipe
behind display type. One or two lime moments per view — no more.

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

- **UI/body + headings**: Bricolage Grotesque (`font-sans`, and
  `font-heading` aliases it). One grotesk with real character carries the
  whole app — body at 400/500, mastheads at 700/800 with tight negative
  tracking (`h1` ≈ `-0.03em`). Chosen specifically to stay off the
  generic-Inter shelf.
- **Numbers/labels/paths**: IBM Plex Mono (`font-mono`) with tabular +
  slashed-zero figures — vault paths, dates, mono micro-labels
  (`.label-mono`, uppercase wide tracking), stat sublines, table figures.
- Big hero numerals (stat values) use the grotesk (`font-heading
  font-extrabold tabular-nums`); small inline data uses mono.
- Scale: page title `text-4xl sm:text-5xl font-extrabold`, stat value
  `text-3xl`, body `text-sm`, captions `label-mono` or
  `text-xs text-muted-foreground`.

## Spacing, radius, elevation

- 4px spacing base. Page gutter `p-4 md:p-6 lg:p-8`, content max-width
  `max-w-5xl` (forms `max-w-3xl`), centered.
- Radius: `--radius: 0` — **everything is sharp.** All `rounded-*`
  utilities resolve to 0 via the `@theme` block; don't fight it.
- Elevation: **flat.** Borders and rules over shadows; cards are a light
  hairline border, no default shadow. `.shadow-hard`/`.shadow-hard-sm`
  (hard ink offset) exist only for deliberate hover lifts. Section breaks
  use rules: `.rule-strong` (2px ink) under mastheads, `bg-border`
  hairlines between list rows.

## Component patterns

- **Sidebar**: shadcn sidebar, `collapsible="icon"`, graphite drawer in
  both themes. Groups **Track** (six domains, icons in domain color +
  mono index) / **Plan** / **Archive**. Active item = sidebar-accent wash
  **plus a lime inset marker bar** (`inset 3px 0 0 sidebar-primary`).
- **Page layout**: every page starts with `<PageHeader>` — a masthead: a
  mono eyebrow (lime square + `label-mono`), a big extrabold grotesk
  title, optional muted description, and a `.rule-strong` divider.
- **Overview**: an editorial contents *list*, not a card grid — ghosted
  index numeral, domain icon, section name + description, mono count +
  arrow; hover shifts padding and lights the row.
- **Stat cards**: light-bordered tile with a 3px domain-colored **top**
  rule (not a left slab), `label-mono` label, oversized grotesk value,
  mono subline.
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
