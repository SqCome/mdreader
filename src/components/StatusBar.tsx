/**
 * StatusBar — bottom strip showing live document statistics.
 *
 * Stateless from the user's perspective: the parent owns `content` and
 * `isDirty` and recomputes the derived values each render. We compute
 * line/char counts cheaply in O(n) so the parent can stay simple.
 */
type StatusBarProps = {
  content: string;
  isDirty: boolean;
  currentFile: string | null;
};

export default function StatusBar({
  content,
  isDirty,
  currentFile,
}: StatusBarProps) {
  // Char count = UTF-16 code units (JS string length). Cheap and good
  // enough for a status indicator.
  const chars = content.length;

  // Line count: count newlines + 1 for the trailing line if any chars
  // exist. Empty document is "0 lines".
  const lines = content.length === 0 ? 0 : content.split("\n").length;

  const dirtyLabel = isDirty ? "● unsaved changes" : "✓ saved";

  return (
    <footer className="status-bar" role="status" aria-live="polite">
      <span className="status-segment">Lines: {lines}</span>
      <span className="status-segment">Chars: {chars}</span>
      <span
        className={`status-segment status-dirty ${
          isDirty ? "is-dirty" : "is-clean"
        }`}
      >
        {dirtyLabel}
      </span>
      <span className="status-spacer" />
      {currentFile && (
        <span className="status-segment status-file" title={currentFile}>
          {currentFile}
        </span>
      )}
    </footer>
  );
}
