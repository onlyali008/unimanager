import { promises as fs } from "node:fs";
import path from "node:path";
import { GarminConnect } from "garmin-connect";

/**
 * Unofficial Garmin Connect access (community garmin-connect lib) using
 * the user's own credentials from env. OAuth tokens are cached in
 * .garmin/ (gitignored) so we log in once, not on every sync.
 * Known limitation: accounts with MFA enabled are not supported.
 */

const TOKEN_DIR = path.join(process.cwd(), ".garmin");

export function garminConfigured(): boolean {
  return Boolean(process.env.GARMIN_EMAIL && process.env.GARMIN_PASSWORD);
}

export async function getGarminClient(
  forceLogin = false,
): Promise<GarminConnect> {
  const username = process.env.GARMIN_EMAIL;
  const password = process.env.GARMIN_PASSWORD;
  if (!username || !password) {
    throw new Error("GARMIN_EMAIL and GARMIN_PASSWORD are not set");
  }

  const client = new GarminConnect({ username, password });

  if (!forceLogin) {
    try {
      await fs.access(path.join(TOKEN_DIR, "oauth2_token.json"));
      client.loadTokenByFile(TOKEN_DIR);
      return client;
    } catch {
      // No cached tokens — fall through to a fresh login.
    }
  }

  await client.login();
  await fs.mkdir(TOKEN_DIR, { recursive: true });
  client.exportTokenToFile(TOKEN_DIR);
  return client;
}

/** Returns a client verified against the API, re-logging-in once if the cached token is stale. */
export async function getVerifiedGarminClient(): Promise<{
  client: GarminConnect;
  displayName: string | null;
}> {
  let client = await getGarminClient();
  try {
    const profile = await client.getUserProfile();
    return { client, displayName: profile.displayName ?? null };
  } catch {
    client = await getGarminClient(true);
    const profile = await client.getUserProfile();
    return { client, displayName: profile.displayName ?? null };
  }
}
