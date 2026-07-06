# AI jobs — scheduling on Windows

Two local jobs keep the vault intelligent. Both run through the app's API
(so they share the vault code and `.env.local`) and require **Ollama
running** (`ollama serve`, auto-starts with the desktop app) with
`llama3.2:3b` and `nomic-embed-text` pulled, plus the Semestra dev server
up (`npm run dev`).

| Job | Endpoint | What it does |
| --- | --- | --- |
| Nightly index | `POST /api/ai/index` | Tags new/changed notes (1–2 kebab-case tags merged into frontmatter, never removed) and updates the incremental embeddings index at `.semestra/index.json` — one chunk per note, frontmatter fields serialized as retrievable text. |
| Weekly insight | `POST /api/ai/insights` | Digests the last 7 days across all domains and writes `insights/YYYY-Www.md` with cross-domain patterns (re-running the same week overwrites it). |

Both are also available as buttons on the Assistant page.

## Task Scheduler setup

Run once in an elevated or normal PowerShell:

```powershell
# Nightly at 02:30
schtasks /Create /TN "Semestra nightly index" /SC DAILY /ST 02:30 `
  /TR "curl.exe -s -X POST http://localhost:3000/api/ai/index"

# Weekly on Sunday at 20:00
schtasks /Create /TN "Semestra weekly insight" /SC WEEKLY /D SUN /ST 20:00 `
  /TR "curl.exe -s -X POST http://localhost:3000/api/ai/insights"
```

Remove with `schtasks /Delete /TN "<name>" /F`.

If the app isn't running at the scheduled time the request fails silently —
either keep `npm run dev` running, or just hit the buttons on the
Assistant page when you open the app. (Packaging in Phase 4 will make
this a background service.)

## How the assistant uses this

Chat questions are embedded locally (nomic-embed-text), matched against
the index by cosine similarity with a boost for insight notes, and the
top matches are sent to Claude (`claude-opus-4-8` by default) as
`<vault_context>` — never the whole vault. If Ollama is down or the index
doesn't exist yet, retrieval degrades to the most recent week of notes
plus the latest insight notes, so chat keeps working.
