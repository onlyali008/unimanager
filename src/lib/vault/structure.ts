import { promises as fs } from "node:fs";

import { getVaultPath } from "./config";
import { noteExists, resolveInVault, writeNote } from "./fs";
import type { DomainSlug, MocFrontmatter } from "./types";

export const DOMAIN_SLUGS: DomainSlug[] = [
  "nutrition",
  "fitness",
  "sleep",
  "wellness",
  "academics",
  "finances",
];

export const VAULT_FOLDERS = [
  ...DOMAIN_SLUGS,
  "daily-notes",
  "insights",
  "moc",
] as const;

const SCHEMA_DOC = `---
type: reference
tags: []
---

# Semestra vault schema

This vault is managed by the Semestra app. Every note is atomic (one
day/month/course per file) and carries a locked YAML frontmatter schema
per domain — do not add or rename frontmatter fields by hand.

| Folder | One note per | Key frontmatter fields |
| --- | --- | --- |
| nutrition/YYYY-MM-DD.md | day | meals[] (name, meal, portion_g, calories, protein_g, carbs_g, fat_g, fdc_id, source), totals |
| fitness/YYYY-MM-DD.md | day | workouts[] (activity, category, duration_min, intensity 1-5, calories_burned), totals |
| sleep/YYYY-MM-DD.md | wake-up day | bedtime, wake_time, duration_h, quality 1-5, interruptions, naps_min |
| wellness/YYYY-MM-DD.md | day | mood, energy, stress (all 1-5), symptoms[] |
| academics/{course}/notes-and-deadlines.md | course | course, course_name, term, credits, deadlines[] (title, due, kind, status, weight_pct) |
| finances/YYYY-MM.md | month | currency, transactions[] (date, amount signed, category, description), totals |
| daily-notes/YYYY-MM-DD.md | day | date only — body holds wikilinks to that day's entries plus a reflection |
| insights/YYYY-Www.md | week | week — written by the AI pipeline in a later phase |
| moc/MOC-{domain}.md | domain | domain — index notes linking to key entries |

All notes share: \`type\`, \`tags\` (freeform, cross-domain, e.g.
#exam-week), and \`created\`. Daily notes reference same-day entries with
folder-qualified wikilinks like \`[[nutrition/2026-07-06|Nutrition]]\` —
filenames repeat across folders, so unqualified links would be ambiguous.
`;

function mocBody(domain: DomainSlug): string {
  const title = domain.charAt(0).toUpperCase() + domain.slice(1);
  return `# MOC — ${title}\n\nIndex of key ${domain} entries. Links will be curated here in a later phase.\n`;
}

/**
 * Creates the vault folder structure, MOC stubs, and schema doc if they
 * don't exist yet. Idempotent — safe to call on every server render.
 */
export async function ensureVaultStructure(): Promise<string> {
  for (const folder of VAULT_FOLDERS) {
    await fs.mkdir(resolveInVault(folder), { recursive: true });
  }

  for (const domain of DOMAIN_SLUGS) {
    const relPath = `moc/MOC-${domain}.md`;
    if (!(await noteExists(relPath))) {
      const frontmatter: MocFrontmatter = {
        type: "moc",
        domain,
        tags: [],
        created: new Date().toISOString(),
      };
      await writeNote(relPath, { ...frontmatter }, mocBody(domain));
    }
  }

  if (!(await noteExists("SCHEMA.md"))) {
    await fs.writeFile(resolveInVault("SCHEMA.md"), SCHEMA_DOC, "utf8");
  }

  return getVaultPath();
}
