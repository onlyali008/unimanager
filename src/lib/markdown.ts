// A tiny, deliberately-limited markdown renderer for artifact previews.
// Security: the source is HTML-escaped FIRST, then a small set of inline and
// block transforms are applied, so no raw user HTML can ever reach the DOM.
// Supported: headings (#, ##, ###), bold, italic, inline code, links (http/https
// or mailto only), unordered/ordered lists, and paragraphs with line breaks.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeHref(url: string): string | null {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed)) {
    // Already escaped upstream; disallow quotes just in case.
    return trimmed.replace(/["']/g, "");
  }
  return null;
}

// Sentinel wrapping a stash index. Uses characters the emphasis regexes never
// match, and HTML-escaping removes any user-supplied "<"/">" so real input
// cannot forge one of these tokens.
function open(i: number): string {
  return `STASH${i}`;
}

function inline(text: string): string {
  const stash: string[] = [];
  const hold = (htmlValue: string): string => {
    stash.push(htmlValue);
    return open(stash.length - 1);
  };

  let out = text;
  // Inline code and links become placeholders first, protecting their
  // contents (especially URLs) from the emphasis passes.
  out = out.replace(/`([^`]+)`/g, (_m, code) => hold(`<code>${code}</code>`));
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, url) => {
    const href = safeHref(url);
    if (!href) return label;
    return hold(
      `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`,
    );
  });

  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  out = out.replace(/_([^_]+)_/g, "<em>$1</em>");

  // Restore stashed spans.
  out = out.replace(/STASH(\d+)/g, (_m, i) => stash[Number(i)] ?? "");
  return out;
}

export function renderMarkdown(source: string): string {
  const escaped = escapeHtml(source);
  const lines = escaped.split("\n");
  const html: string[] = [];

  let listType: "ul" | "ol" | null = null;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      html.push(`<p>${paragraph.map(inline).join("<br>")}</p>`);
      paragraph = [];
    }
  };
  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "") {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length + 2; // # -> h3, ## -> h4, ### -> h5
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    const ul = /^[-*]\s+(.*)$/.exec(trimmed);
    if (ul) {
      flushParagraph();
      if (listType !== "ul") {
        closeList();
        html.push("<ul>");
        listType = "ul";
      }
      html.push(`<li>${inline(ul[1])}</li>`);
      continue;
    }

    const ol = /^\d+\.\s+(.*)$/.exec(trimmed);
    if (ol) {
      flushParagraph();
      if (listType !== "ol") {
        closeList();
        html.push("<ol>");
        listType = "ol";
      }
      html.push(`<li>${inline(ol[1])}</li>`);
      continue;
    }

    closeList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  closeList();
  return html.join("\n");
}
