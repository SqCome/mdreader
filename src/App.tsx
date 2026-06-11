import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Editor from "./components/Editor";
import Preview from "./components/Preview";
import Outline from "./components/Outline";
import StatusBar from "./components/StatusBar";
import Toolbar from "./components/Toolbar";
import { renderMarkdown } from "./lib/markdown";
import { extractOutline, activeHeading } from "./lib/outline";
import {
  fileExists,
  getFileName,
  openFileDialog,
  readFile,
  saveFileDialog,
  writeFile,
} from "./lib/tauri-api";
import { EditorView } from "@codemirror/view";
import "./App.css";

/**
 * Default welcome document. Shown the first time the app opens, and any
 * time the user opens a new buffer via "Open" or "Save As".
 *
 * Intentionally exercises every major markdown construct so the preview
 * pane has something interesting to render on first paint.
 */
const DEFAULT_MD = `# Welcome to MD Reader

A minimal **Tauri + React** markdown editor. Edit the source on the left —
the preview on the right updates as you type.

## Try the toolbar

- **Open** — pick a \`.md\` file from disk
- **Save** — write back to the current file (or prompt if untitled)
- **Save As** — write to a new file

## Markdown features

You can write **bold**, *italic*, ~~strikethrough~~, and \`inline code\`.

> Blockquotes work too. They render with a left border and muted text.

### Lists

1. Ordered items
2. Like this
3. Are auto-numbered

- Unordered lists
- Use any of \`-\`, \`*\`, or \`+\`
- Nested items indent with two spaces

### Code blocks

\`\`\`rust
fn main() {
    // Tauri round-trips happen through the \`invoke\` JS API.
    let greeting = mdreader_lib::hello("MD Reader");
    println!("{greeting}");
}
\`\`\`

\`\`\`typescript
// And on the JS side:
import { invoke } from "@tauri-apps/api/core";
const text = await invoke<string>("read_file", { path: "/tmp/x.md" });
\`\`\`

### Links & images

Visit the [Tauri docs](https://tauri.app/) for more on commands and capabilities.

![MD Reader logo](https://placehold.co/320x80?text=MD+Reader)

### Tables

| Action       | Shortcut      |
|--------------|---------------|
| Open file    | (toolbar)     |
| Save file    | (toolbar)     |
| Save as new  | (toolbar)     |

---

*Clear this content and start writing — it's just a starter.*
`;

/** Path shown in the UI when the user closes the file but keeps the buffer. */
const UNTITLED: string | null = null;

function App() {
  const [content, setContent] = useState<string>(DEFAULT_MD);
  const [currentFile, setCurrentFile] = useState<string | null>(UNTITLED);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [cursorLine, setCursorLine] = useState<number>(0);

  // Ref to the raw CodeMirror EditorView — used for outline jumps and scroll sync
  const editorViewRef = useRef<EditorView | null>(null);

  // Ref to the preview container — used for scroll sync
  const previewRef = useRef<HTMLDivElement>(null);

  // Track the last content we successfully wrote
  const lastSavedRef = useRef<string>(DEFAULT_MD);

  // Ref to prevent scroll feedback loops
  const scrollingRef = useRef<"editor" | "preview" | null>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Render markdown
  const html = useMemo(() => renderMarkdown(content), [content]);

  // ---- Outline data ----
  const outlineItems = useMemo(() => extractOutline(content), [content]);

  // Line index map: editor line number (0-based) → character offset
  const lineIndexMap = useCallback(
    (line: number): number => {
      const view = editorViewRef.current;
      if (!view) return 0;
      return view.state.doc.line(Math.min(line + 1, view.state.doc.lines)).from;
    },
    []
  );

  const currentHeading = useMemo(
    () => activeHeading(outlineItems, cursorLine, lineIndexMap),
    [outlineItems, cursorLine, lineIndexMap]
  );

  // ---- Cursor tracking ----
  // onCursorChange is wired into Editor's updateListener, so this is a no-op.
  // The actual tracking happens inside Editor.tsx.
  const handleCursorChange = useCallback((line: number) => {
    setCursorLine(line);
  }, []);

  // ---- Content change handler ----
  const handleContentChange = useCallback((next: string) => {
    setContent(next);
    setIsDirty(next !== lastSavedRef.current);
  }, []);

  // ---- Outline jump ----
  const handleJumpTo = useCallback((from: number) => {
    const view = editorViewRef.current;
    if (!view) return;
    view.dispatch({
      selection: { anchor: from },
      effects: EditorView.scrollIntoView(from, { y: "center" }),
    });
    view.focus();
  }, []);

  // ---- Scroll sync ----
  useEffect(() => {
    const view = editorViewRef.current;
    const previewEl = previewRef.current;
    if (!view || !previewEl) return;

    const handleEditorScroll = () => {
      if (scrollingRef.current === "preview") return;
      scrollingRef.current = "editor";
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);

      const { scrollTop, scrollHeight, clientHeight } = view.scrollDOM;
      const ratio = scrollTop / Math.max(scrollHeight - clientHeight, 1);
      previewEl.scrollTop = ratio * (previewEl.scrollHeight - previewEl.clientHeight);

      scrollTimerRef.current = setTimeout(() => {
        scrollingRef.current = null;
      }, 60);
    };

    const handlePreviewScroll = () => {
      if (scrollingRef.current === "editor") return;
      scrollingRef.current = "preview";
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);

      const { scrollTop, scrollHeight, clientHeight } = previewEl;
      const ratio = scrollTop / Math.max(scrollHeight - clientHeight, 1);
      view.scrollDOM.scrollTop = ratio * (view.scrollDOM.scrollHeight - view.scrollDOM.clientHeight);

      scrollTimerRef.current = setTimeout(() => {
        scrollingRef.current = null;
      }, 60);
    };

    view.scrollDOM.addEventListener("scroll", handleEditorScroll, { passive: true });
    previewEl.addEventListener("scroll", handlePreviewScroll, { passive: true });

    return () => {
      view.scrollDOM.removeEventListener("scroll", handleEditorScroll);
      previewEl.removeEventListener("scroll", handlePreviewScroll);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, []);

  // ---- File operations ----
  const handleOpen = useCallback(async () => {
    try {
      const path = await openFileDialog();
      if (!path) return;
      const text = await readFile(path);
      setContent(text);
      setCurrentFile(path);
      lastSavedRef.current = text;
      setIsDirty(false);
      setStatusMessage(`Opened ${await getFileName(path)}`);
    } catch (err) {
      setStatusMessage(`Open failed: ${String(err)}`);
    }
  }, []);

  const persist = useCallback(
    async (path: string, text: string) => {
      await writeFile(path, text);
      setCurrentFile(path);
      lastSavedRef.current = text;
      setIsDirty(false);
      setStatusMessage(`Saved ${await getFileName(path)}`);
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!currentFile) {
      await handleSaveAs();
      return;
    }
    try {
      await persist(currentFile, content);
    } catch (err) {
      setStatusMessage(`Save failed: ${String(err)}`);
    }
  }, [content, currentFile, persist]);

  const handleSaveAs = useCallback(async () => {
    try {
      const defaultName = currentFile
        ? await getFileName(currentFile)
        : "untitled.md";
      const path = await saveFileDialog(defaultName);
      if (!path) return;
      await persist(path, content);
    } catch (err) {
      setStatusMessage(`Save As failed: ${String(err)}`);
    }
  }, [content, currentFile, persist]);

  // Warn before close
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // File health check
  useEffect(() => {
    if (!currentFile) return;
    let cancelled = false;
    fileExists(currentFile)
      .then((ok) => {
        if (!cancelled && !ok) {
          setStatusMessage(`Note: ${currentFile} not found on disk`);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [currentFile]);

  return (
    <div className="app">
      <Toolbar
        onOpen={handleOpen}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        currentFile={currentFile}
        isDirty={isDirty}
      />
      <div className="panes">
        <Outline
          items={outlineItems}
          activeHeading={currentHeading}
          onJumpTo={handleJumpTo}
        />
        <Editor
          value={content}
          onChange={handleContentChange}
          editorViewRef={editorViewRef}
          onCursorChange={handleCursorChange}
        />
        <Preview html={html} previewRef={previewRef} />
      </div>
      <StatusBar
        content={content}
        isDirty={isDirty}
        currentFile={currentFile}
      />
      {statusMessage && (
        <div className="status-toast" role="status">
          {statusMessage}
        </div>
      )}
    </div>
  );
}

export default App;
