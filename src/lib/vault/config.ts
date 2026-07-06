import path from "node:path";

/**
 * Absolute path to the Obsidian vault. Configured via OBSIDIAN_VAULT_PATH;
 * falls back to ./vault inside the project for fresh checkouts.
 */
export function getVaultPath(): string {
  const configured = process.env.OBSIDIAN_VAULT_PATH;
  if (configured && configured.trim().length > 0) {
    return path.resolve(configured.trim());
  }
  return path.resolve(process.cwd(), "vault");
}
