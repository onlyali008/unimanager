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
| `FDC_API_KEY` | USDA FoodData Central key for nutrition search (Phase 1) |

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui ·
gray-matter for frontmatter I/O · next-themes for dark mode.

## Roadmap

- **Phase 0 — Foundation** (this): design system, vault structure +
  typed fs layer, app shell with sidebar navigation.
- **Phase 1 — Core tracking**: entry forms + dashboards per domain,
  USDA FDC-powered nutrition logging, auto-created daily notes.
- **Phase 2 — Schedule maker**: calendar from academic deadlines with
  conflict detection.
- **Phase 3 — AI**: nightly Ollama tagging/embeddings, weekly insight
  notes, Claude-powered assistant with vault retrieval.
- **Phase 4 — Packaging**: Tauri (desktop) and Capacitor (mobile).
- **Phase 5 — Polish**: UI and code-quality pass.
- **Phase 6 — Remote access**: Tailscale setup docs.
