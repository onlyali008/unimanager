// Client-only text extraction for syllabus files. The PDF parser (unpdf, which
// wraps pdf.js) is dynamically imported so it never weighs down the main bundle
// and only loads when a student actually parses a PDF.

export async function extractTextFromBlob(
  blob: Blob,
  mimeType: string,
): Promise<string> {
  const type = (mimeType || blob.type || "").toLowerCase();

  if (type.includes("pdf")) {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const buf = new Uint8Array(await blob.arrayBuffer());
    const pdf = await getDocumentProxy(buf);
    const { text } = await extractText(pdf, { mergePages: true });
    return Array.isArray(text) ? text.join("\n") : text;
  }

  // Plain-text-ish files (txt, md, csv) — and a best-effort fallback.
  return blob.text();
}
