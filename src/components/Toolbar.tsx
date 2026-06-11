/**
 * Toolbar — top bar with file actions and the current filename.
 *
 * Stateless. All state lives in `App`; the toolbar just dispatches.
 *
 * Props mirror the spec:
 *   - onOpen:    user clicked "Open"   (prompt a file, read it, etc.)
 *   - onSave:    user clicked "Save"   (overwrite current file or Save As)
 *   - onSaveAs:  user clicked "Save As" (always prompt a new path)
 *   - currentFile: absolute path of the open file, or null for "untitled"
 *   - isDirty:   true when the buffer has unsaved changes
 *                (used to disable Save when there is nothing to save,
 *                and to mark the filename with a leading dot)
 */
type ToolbarProps = {
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  currentFile: string | null;
  isDirty: boolean;
};

export default function Toolbar({
  onOpen,
  onSave,
  onSaveAs,
  currentFile,
  isDirty,
}: ToolbarProps) {
  // Show only the basename in the toolbar; the full path lives in the
  // StatusBar tooltip so the header stays compact.
  const fileName = currentFile
    ? currentFile.split(/[\\/]/).pop() || currentFile
    : "Untitled";

  // Save is a no-op when nothing has changed since the last save. We
  // still let the user click it (in case they want to force a write),
  // but visually mark it as disabled for a hint.
  const saveDisabled = !isDirty && !currentFile;

  return (
    <div className="toolbar" role="toolbar" aria-label="File actions">
      <h1 className="toolbar-title">MD Reader</h1>

      <div className="toolbar-buttons">
        <button type="button" onClick={onOpen} title="Open a .md file">
          Open
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saveDisabled}
          title="Save (writes to the current file, or prompts for a path)"
        >
          Save
        </button>
        <button type="button" onClick={onSaveAs} title="Save as a new file">
          Save As
        </button>
      </div>

      <span className="toolbar-sep" aria-hidden="true" />

      <span
        className={`toolbar-filename ${isDirty ? "is-dirty" : ""}`}
        title={currentFile ?? "No file open"}
      >
        {isDirty ? "● " : ""}
        {fileName}
      </span>
    </div>
  );
}
