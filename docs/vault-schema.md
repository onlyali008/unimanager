# Vault schema (locked)

The Obsidian vault at `OBSIDIAN_VAULT_PATH` is Semestra's only data
store — plain markdown with YAML frontmatter, no database. This schema
was approved on 2026-07-06 and is **locked**: every file in a domain
folder carries exactly these fields, forever. Additive changes require a
migration plan. TypeScript definitions: `src/lib/vault/types.ts`.

## Principles

- **Atomic notes**: one note per day per domain (per month for finances,
  per course for academics). Never bundle days or domains into one file.
- **Structured data lives in frontmatter**, prose lives in the body.
  Multiple meals/workouts/transactions within a note's period are YAML
  lists inside that one note, with precomputed `totals` so dashboards
  don't parse bodies.
- **Dates are strings** (`"YYYY-MM-DD"`), never YAML date objects.
- **Wikilinks are folder-qualified** (`[[nutrition/2026-07-06|Nutrition]]`)
  because date filenames repeat across folders.
- **Tags are freeform and cross-domain** (`tags: [exam-week, low-energy]`).

## Shared fields (every note)

```yaml
type: nutrition | fitness | sleep | wellness | academics | finances | daily | insight | moc
tags: []            # freeform, cross-domain
created: <ISO timestamp>
```

## Per-domain fields

### nutrition/YYYY-MM-DD.md — one per day

```yaml
date: "2026-07-06"
meals:
  - name: "Chicken breast, grilled"
    meal: lunch               # breakfast | lunch | dinner | snack
    portion_g: 150
    calories: 248
    protein_g: 46.5
    carbs_g: 0
    fat_g: 5.4
    fdc_id: 171477            # USDA FDC id; null when manual
    source: fdc               # fdc | manual
totals: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
```

### fitness/YYYY-MM-DD.md — one per day

```yaml
date: "2026-07-06"
workouts:
  - activity: "Push day"
    category: strength        # strength | cardio | sport | mobility | other
    duration_min: 55
    intensity: 4              # 1–5 perceived effort
    calories_burned: null     # optional
totals: { duration_min: 0, sessions: 0 }
```

### sleep/YYYY-MM-DD.md — one per day (date = morning you woke up)

```yaml
date: "2026-07-06"
bedtime: "23:40"
wake_time: "07:30"
duration_h: 7.8
quality: 4                    # 1–5
interruptions: 1
naps_min: 0
```

### wellness/YYYY-MM-DD.md — one per day; reflection in body

```yaml
date: "2026-07-06"
mood: 4                       # 1–5
energy: 3                     # 1–5
stress: 2                     # 1–5
symptoms: []
```

### academics/{course}/notes-and-deadlines.md — one per course; notes in body

```yaml
course: "CS 201"
course_name: "Data Structures"
term: "2026-fall"
credits: 3
deadlines:
  - title: "Assignment 2"
    due: "2026-07-15"
    kind: assignment          # assignment | exam | quiz | project | reading
    status: todo              # todo | in_progress | done
    weight_pct: 10            # optional (null)
```

### finances/YYYY-MM.md — one per month

```yaml
month: "2026-07"
currency: CAD                 # default currency
transactions:
  - date: "2026-07-03"
    amount: -12.50            # negative = expense, positive = income
    category: food            # food | transport | housing | tuition | entertainment | health | income | other
    description: "Lunch"
totals: { income: 0, expenses: 0, net: 0 }
```

### daily-notes/YYYY-MM-DD.md — one per day

Frontmatter: `type: daily`, `date`, shared fields only. Body contains
folder-qualified wikilinks to that day's entries (never their content)
plus a short freeform reflection.

### insights/YYYY-Www.md (Phase 3) and moc/MOC-{domain}.md

`insight` notes carry `week: "2026-W28"`; `moc` notes carry `domain`.
Both are stubs until later phases fill them.
