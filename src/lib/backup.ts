// Full backup: the JSON store plus audio recordings. Audio bytes live in
// IndexedDB, so a plain store export would leave recordings behind. Here we
// inline each recording as a data URL under an `audio` map. The rest of the
// object is a normal StoreState, so older importers (and migrate) ignore the
// extra `audio` key and still work.

import type { StoreState } from "./types";
import { importJSON } from "./storage";
import { getAudio, putAudio } from "./audioStore";

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export interface BackupStats {
  recordings: number;
}

export async function buildBackup(
  state: StoreState,
): Promise<{ json: string; stats: BackupStats }> {
  const audio: Record<string, string> = {};
  for (const artifact of state.artifacts) {
    if (artifact.kind === "audio" && artifact.audioId) {
      try {
        const blob = await getAudio(artifact.audioId);
        if (blob) audio[artifact.audioId] = await blobToDataUrl(blob);
      } catch {
        // Skip a recording that can't be read; metadata still exports.
      }
    }
  }
  const json = JSON.stringify({ ...state, audio }, null, 2);
  return { json, stats: { recordings: Object.keys(audio).length } };
}

export async function restoreBackup(
  text: string,
): Promise<{ state: StoreState; stats: BackupStats }> {
  // Validate/migrate the store first (throws on invalid JSON).
  const state = importJSON(text);

  let recordings = 0;
  const parsed = JSON.parse(text) as { audio?: Record<string, unknown> };
  if (parsed.audio && typeof parsed.audio === "object") {
    await Promise.all(
      Object.entries(parsed.audio).map(async ([id, dataUrl]) => {
        if (typeof dataUrl !== "string") return;
        try {
          const blob = await (await fetch(dataUrl)).blob();
          await putAudio(id, blob);
          recordings += 1;
        } catch {
          // Skip a recording that can't be decoded.
        }
      }),
    );
  }

  return { state, stats: { recordings } };
}
