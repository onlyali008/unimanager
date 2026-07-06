import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

import { getVaultPath } from "./config";

export interface VaultNote<T = Record<string, unknown>> {
  /** Vault-relative path with forward slashes, e.g. "nutrition/2026-07-06.md". */
  relPath: string;
  frontmatter: T;
  body: string;
}

/** Resolves a vault-relative path, refusing anything that escapes the vault. */
export function resolveInVault(relPath: string): string {
  const vaultRoot = getVaultPath();
  const absolute = path.resolve(vaultRoot, relPath);
  if (
    absolute !== vaultRoot &&
    !absolute.startsWith(vaultRoot + path.sep)
  ) {
    throw new Error(`Path escapes vault root: ${relPath}`);
  }
  return absolute;
}

export async function noteExists(relPath: string): Promise<boolean> {
  try {
    await fs.access(resolveInVault(relPath));
    return true;
  } catch {
    return false;
  }
}

export async function readNote<T = Record<string, unknown>>(
  relPath: string,
): Promise<VaultNote<T> | null> {
  const absolute = resolveInVault(relPath);
  // The vault is hand-editable in Obsidian — treat unreadable files and
  // malformed YAML frontmatter the same way: as a missing note.
  let parsed: ReturnType<typeof matter>;
  try {
    parsed = matter(await fs.readFile(absolute, "utf8"));
  } catch {
    return null;
  }
  return {
    relPath: relPath.replaceAll("\\", "/"),
    frontmatter: parsed.data as T,
    body: parsed.content,
  };
}

export async function writeNote<T extends Record<string, unknown>>(
  relPath: string,
  frontmatter: T,
  body: string,
): Promise<void> {
  const absolute = resolveInVault(relPath);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  const serialized = matter.stringify(body, frontmatter);
  await fs.writeFile(absolute, serialized, "utf8");
}

/**
 * Lists markdown notes in a vault folder (non-recursive),
 * newest filename first — date-named files sort chronologically.
 */
export async function listNotes(relDir: string): Promise<string[]> {
  const absolute = resolveInVault(relDir);
  let entries;
  try {
    entries = await fs.readdir(absolute, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => `${relDir.replaceAll("\\", "/")}/${entry.name}`)
    .sort()
    .reverse();
}

/** Recursively counts .md files under a vault folder. */
export async function countNotes(relDir: string): Promise<number> {
  const absolute = resolveInVault(relDir);
  let entries;
  try {
    entries = await fs.readdir(absolute, { withFileTypes: true });
  } catch {
    return 0;
  }
  let count = 0;
  for (const entry of entries) {
    if (entry.isDirectory()) {
      count += await countNotes(`${relDir}/${entry.name}`);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      count += 1;
    }
  }
  return count;
}
