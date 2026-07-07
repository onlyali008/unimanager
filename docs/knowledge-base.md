# Knowledge base — books, wikis, and articles

Semestra can absorb external reference material (books, articles, wikis) and
make it available to the AI alongside your personal vault. It rides the same
local retrieval pipeline as your notes: material is embedded with Ollama
(`nomic-embed-text`) and searched by cosine similarity, so both the Claude
assistant and any Ollama-powered feature can draw on it. Everything stays on
your machine.

Manage it from the **Library** page (sidebar → Archive → Library).

## What gets stored where

A new `knowledge/` tree in your vault (additive — the locked personal domain
schemas are untouched):

| Folder | Holds |
| --- | --- |
| `knowledge/inbox/` | **Drop zone.** Put files here to absorb them. |
| `knowledge/books/` | One `<slug>.md` per absorbed document (cleaned text in body). |
| `knowledge/books/_originals/` | The original files, moved here after absorbing. |
| `knowledge/wikis/<subject>/` | Wikipedia article extracts, per subject. |
| `knowledge/reference/` | Articles pulled from your URLs and RSS/Atom feeds. |

Each note carries the additive `knowledge` frontmatter type (`source`, `title`,
`author`, `url`, `subject`, `added`, `hash`). Embeddings live in a **separate**
index, `.semestra/knowledge.json`, so a large library never bloats or slows the
personal note index.

## 1. Absorbing books and documents

1. Drop **PDF, EPUB, txt, md, or html** files into `knowledge/inbox/` (from
   Obsidian, File Explorer, or over a synced folder).
2. On the Library page, click **Ingest inbox** (or `POST /api/knowledge/ingest`).

Each file is converted to clean text, split into overlapping chunks, embedded,
and written as one note under `knowledge/books/`. Originals move to
`_originals/`. Re-dropping the same file is detected by content hash and skipped.
Image-only/scanned PDFs with no extractable text are reported as skipped.

## 2. Daily pull — wikis, URLs, and feeds

Set your sources on the Library page (stored in
`.semestra/knowledge-sources.json`):

- **Wikipedia subjects** — each pull gathers the top *N* related articles per
  subject (`articles per subject`). Your current course names are offered as
  one-click suggestions, but only subjects you add are pulled.
- **Article URLs** — the main readable text is extracted from each page.
- **RSS / Atom feeds** — the most recent entries per feed are fetched and
  extracted.

Click **Pull sources** (or `POST /api/knowledge/pull`) to run it now. Re-pulling
updates existing notes in place (dedup by content hash), so it won't pile up.

## 3. Re-indexing

Both jobs re-embed automatically when they finish (if Ollama is running). If you
edit knowledge notes by hand in Obsidian, click **Re-index**
(`POST /api/knowledge/index`) — it's incremental, re-embedding only changed
notes. Requires Ollama with `nomic-embed-text`.

## How the assistant uses it

For each question, retrieval embeds the query once and searches two sources: your
personal notes (as `<vault_context>`) and the knowledge base (as
`<reference_knowledge>`). Knowledge passages are attached **only when they clear
a relevance gate**, so ordinary life questions still get your logs, not random
book text. The assistant cites reference material by title and keeps it distinct
from facts about your life. Tune the gate with `KNOWLEDGE_MIN_SIMILARITY` in
`.env.local` (default `0.55`) if retrieval feels too eager or too shy.

## Scheduling

See `docs/ai-jobs.md` for the daily Task Scheduler entry that runs the pull
automatically.
