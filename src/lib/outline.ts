/**
 * outline.ts — Extract h1–h3 headings from markdown with character offsets.
 *
 * Used by the Outline sidebar to:
 *   1. Render the table-of-contents.
 *   2. Provide character offsets for jump-to-section in CodeMirror.
 */

export interface OutlineItem {
  level: 1 | 2 | 3;
  text: string;
  from: number; // character offset in the raw markdown string
  to: number;
}

/**
 * Extract all h1–h3 headings from `markdown` with their text content
 * and character offsets. The regex /^#{1,3}\s+(.+)$/gm matches:
 *   - exactly 1–3 hash marks
 *   - followed by one or more whitespace characters
 *   - then the rest of the line (the heading text)
 *
 * We use match.index (available on the exec() result) as `from`,
 * and match.index + match[0].length as `to`.
 */
export function extractOutline(markdown: string): OutlineItem[] {
  const items: OutlineItem[] = [];
  const re = /^#{1,3}\s+(.+)$/gm;
  let match: RegExpExecArray | null;

  while ((match = re.exec(markdown)) !== null) {
    const level = match[0].match(/^(#{1,3})/)?.[1].length as 1 | 2 | 3;
    const text = match[1].trim();
    items.push({
      level,
      text,
      from: match.index,
      to: match.index + match[0].length,
    });
  }

  return items;
}

/**
 * Given an array of OutlineItems and a 0-based cursor line number in the
 * editor, return the OutlineItem of the nearest heading that is at or above
 * the current line (i.e., the section this line belongs to).
 *
 * Returns undefined if cursor is above the first heading.
 */
export function activeHeading(
  items: OutlineItem[],
  cursorLine: number,
  lineIndexMap: (line: number) => number // maps editor line → char offset
): OutlineItem | undefined {
  const cursorOffset = lineIndexMap(cursorLine);

  let active: OutlineItem | undefined;
  for (const item of items) {
    if (item.from <= cursorOffset) {
      active = item;
    } else {
      break; // items are in document order
    }
  }
  return active;
}
