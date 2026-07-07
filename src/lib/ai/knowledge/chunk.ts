/**
 * Splits long reference text into overlapping chunks for embedding.
 * Books and articles are far too long to embed whole (the personal-note
 * path uses one chunk per note); here we pack paragraphs up to a target
 * size, carry a tail of overlap into the next chunk so a passage split
 * across a boundary is still retrievable, and hard-wrap any single
 * paragraph that exceeds the target. Pure and deterministic.
 */

const TARGET = 3500; // ~900 tokens — comfortably under the embed input cap
const OVERLAP = 500;

export function chunkText(
  text: string,
  opts?: { target?: number; overlap?: number },
): string[] {
  const target = opts?.target ?? TARGET;
  const overlap = opts?.overlap ?? OVERLAP;

  const clean = text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!clean) return [];

  // Break into paragraph-sized units first; hard-split any that are huge.
  const units: string[] = [];
  for (const para of clean.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)) {
    if (para.length <= target) {
      units.push(para);
      continue;
    }
    let buf = "";
    for (const sentence of para.split(/(?<=[.!?])\s+/)) {
      if (buf && buf.length + sentence.length + 1 > target) {
        units.push(buf.trim());
        buf = "";
      }
      if (sentence.length > target) {
        for (let i = 0; i < sentence.length; i += target) {
          units.push(sentence.slice(i, i + target));
        }
      } else {
        buf = buf ? `${buf} ${sentence}` : sentence;
      }
    }
    if (buf.trim()) units.push(buf.trim());
  }

  // Greedily pack units into chunks, seeding each with the previous tail.
  const chunks: string[] = [];
  let current = "";
  for (const unit of units) {
    if (current && current.length + unit.length + 2 > target) {
      chunks.push(current.trim());
      const tail = current.slice(Math.max(0, current.length - overlap));
      current = `${tail}\n\n${unit}`;
    } else {
      current = current ? `${current}\n\n${unit}` : unit;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}
