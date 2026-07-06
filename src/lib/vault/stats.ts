import { getVaultPath } from "./config";
import { countNotes } from "./fs";
import { DOMAIN_SLUGS, ensureVaultStructure } from "./structure";
import type { DomainSlug } from "./types";

export interface VaultStats {
  path: string;
  counts: Record<DomainSlug, number>;
  dailyNotes: number;
  totalNotes: number;
}

/** Snapshot of the vault for the overview page. Bootstraps the vault if needed. */
export async function getVaultStats(): Promise<VaultStats> {
  await ensureVaultStructure();

  const counts = {} as Record<DomainSlug, number>;
  for (const domain of DOMAIN_SLUGS) {
    counts[domain] = await countNotes(domain);
  }
  const dailyNotes = await countNotes("daily-notes");
  const totalNotes =
    Object.values(counts).reduce((sum, n) => sum + n, 0) + dailyNotes;

  return {
    path: getVaultPath(),
    counts,
    dailyNotes,
    totalNotes,
  };
}
