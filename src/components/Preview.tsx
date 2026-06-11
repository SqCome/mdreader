/**
 * Preview — renders the HTML produced by `markdown-it`.
 *
 * The HTML comes from a trusted local pipeline (the user's own input
 * parsed by markdown-it in our own renderer), so `dangerouslySetInnerHTML`
 * is acceptable for this single-user, offline app. If the source ever
 * becomes untrusted/remote, run it through a sanitizer (e.g. DOMPurify)
 * here.
 *
 * The container carries the `markdown-body` class from
 * `github-markdown-css` to get GitHub-flavoured styling for free.
 */
import type { RefObject } from "react";

type PreviewProps = {
  html: string;
  /** Ref to the scrollable preview body element, used for scroll sync */
  previewRef?: RefObject<HTMLDivElement>;
};

export default function Preview({ html, previewRef }: PreviewProps) {
  return (
    <section className="preview-pane" aria-label="Rendered preview">
      <header>Preview</header>
      <div
        ref={previewRef}
        className="preview-body markdown-body"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}
