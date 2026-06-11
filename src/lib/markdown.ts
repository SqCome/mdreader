/**
 * Markdown rendering pipeline.
 *
 * Single shared `MarkdownIt` instance configured for this app:
 *   - `html`   : trust user-authored HTML (single-user, offline editor)
 *   - `linkify`: auto-link bare URLs
 *   - `breaks` : treat lone `\n` as `<br>` (GitHub-flavoured feel)
 *
 * Code blocks are highlighted with highlight.js. We import the common
 * language bundle (rust, ts, js, json, bash, python, css, html, sql,
 * go, java, c, cpp, markdown, etc.) so a wide range of fenced blocks
 * Just Work. Unknown languages still render as plain monospaced text
 * via highlight.js's auto-detect fallback.
 */

import MarkdownIt from "markdown-it";
import type { Options } from "markdown-it";
import hljs from "highlight.js/lib/common";

// Local HTML-escape helper. We avoid referencing `md.utils.escapeHtml`
// from inside the `new MarkdownIt({...})` literal to sidestep a TS7022
// "self-reference in initializer" error.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const mdOptions: Options = {
  html: true,
  linkify: true,
  breaks: true,
  typographer: false,
  highlight(str: string, lang: string): string {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
        }</code></pre>`;
      } catch {
        // fall through to default
      }
    }
    // No language (or unknown): escape and emit a plain <pre><code>.
    return `<pre class="hljs"><code>${escapeHtml(str)}</code></pre>`;
  },
};

const md: MarkdownIt = new MarkdownIt(mdOptions);

export default md;

/** Convenience: render a markdown string to HTML using the shared instance. */
export function renderMarkdown(source: string): string {
  return md.render(source);
}
