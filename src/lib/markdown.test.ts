import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown";

describe("renderMarkdown", () => {
  it("escapes HTML to prevent injection", () => {
    const out = renderMarkdown("<script>alert('x')</script>");
    expect(out).not.toContain("<script>");
    expect(out).toContain("&lt;script&gt;");
  });

  it("renders headings at shifted levels", () => {
    expect(renderMarkdown("# Title")).toContain("<h3>Title</h3>");
    expect(renderMarkdown("## Sub")).toContain("<h4>Sub</h4>");
  });

  it("renders bold, italic, and inline code", () => {
    expect(renderMarkdown("**b**")).toContain("<strong>b</strong>");
    expect(renderMarkdown("_i_")).toContain("<em>i</em>");
    expect(renderMarkdown("`c`")).toContain("<code>c</code>");
  });

  it("renders unordered and ordered lists", () => {
    expect(renderMarkdown("- one\n- two")).toContain(
      "<ul>\n<li>one</li>\n<li>two</li>\n</ul>",
    );
    expect(renderMarkdown("1. a\n2. b")).toContain("<ol>");
  });

  it("allows safe links only", () => {
    expect(renderMarkdown("[ok](https://a.com)")).toContain(
      '<a href="https://a.com"',
    );
    // javascript: scheme is rejected, link text kept as plain text.
    const bad = renderMarkdown("[x](javascript:alert(1))");
    expect(bad).not.toContain("href");
    expect(bad).toContain("x");
  });

  it("groups lines into paragraphs with line breaks", () => {
    expect(renderMarkdown("line one\nline two")).toContain(
      "<p>line one<br>line two</p>",
    );
  });
});
