# Semestra

Your university life in one calm place — nutrition, fitness, sleep,
wellness, academics, and finances, tracked as plain markdown notes in an
Obsidian vault, with dashboards, a schedule maker, and an AI assistant on
top.

## How it works

There is no database. Every entry is an atomic markdown note with locked
YAML frontmatter inside your Obsidian vault (`OBSIDIAN_VAULT_PATH`), so
your data stays yours, greppable, and editable in Obsidian. The app is a
Next.js UI over that vault.

- Vault schema: [docs/vault-schema.md](docs/vault-schema.md)
- Design system: [docs/design-system.md](docs/design-system.md)

## Setup

```bash
npm install
cp .env.example .env.local   # then edit values
npm run dev                  # http://localhost:3000
```

`.env.local`:

| Variable | Purpose |
| --- | --- |
| `OBSIDIAN_VAULT_PATH` | Absolute path to your vault; folder structure is created on first run |
| `USDA_API_KEY` | USDA FoodData Central key for nutrition search + macro autofill |
| `GARMIN_EMAIL` / `GARMIN_PASSWORD` | Garmin Connect login for the fitness/sleep/wellness sync (unofficial API; tokens cached in `.garmin/`; MFA accounts unsupported) |
| `ANTHROPIC_API_KEY` | Claude API key for the Phase 3 assistant (unused until then) |

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui ·
gray-matter for frontmatter I/O · next-themes for dark mode.

## Roadmap

- **Phase 0 — Foundation** (done): design system, vault structure +
  typed fs layer, app shell with sidebar navigation.
- **Phase 1 — Core tracking** (this): entry forms + dashboards per
  domain, USDA FDC-powered nutrition logging, auto-created daily notes,
  Garmin Connect sync into fitness/sleep/wellness.
- **Phase 2 — Schedule maker** (done): calendar from academic deadlines
  with conflict detection.
- **Phase 3 — AI** (this): nightly Ollama tagging/embeddings, weekly
  insight notes, Claude-powered assistant with vault retrieval — see
  [docs/ai-jobs.md](docs/ai-jobs.md).
- **Phase 4 — Packaging** (this): Tauri desktop app bundling the full
  server; Capacitor Android thin client that connects to your PC — see
  [docs/packaging.md](docs/packaging.md).
- **Phase 5 — Polish**: UI and code-quality pass.
- **Phase 6 — Remote access** (this): email + password + emailed-code
  login gating the whole app, and Tailscale setup for phone/laptop
  access — see [docs/remote-access.md](docs/remote-access.md).
