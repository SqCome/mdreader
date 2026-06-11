import { MutableRefObject, useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  crosshairCursor,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  rectangularSelection,
} from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import { markdown } from "@codemirror/lang-markdown";
import { highlightSelectionMatches, openSearchPanel, searchKeymap } from "@codemirror/search";
import { autocompletion, closeBrackets } from "@codemirror/autocomplete";
import { oneDark } from "@codemirror/theme-one-dark";

/**
 * Editor — the markdown source input.
 *
 * Backed by CodeMirror 6. The props contract `{ value, onChange }` is
 * unchanged from the previous textarea implementation, so App.tsx and
 * any other caller stays untouched.
 *
 * Integration notes:
 *  - We mount CodeMirror imperatively via `useRef` + `useEffect`, NOT
 *    via `@uiw/react-codemirror`. That keeps full control of the
 *    EditorView lifecycle (destroy on unmount, dispatch on external
 *    value changes) and avoids an extra dependency.
 *  - `onChange` is stored in a ref so the EditorView (which is created
 *    once) always sees the latest callback without re-creating the
 *    editor on every render.
 *  - External `value` updates are mirrored into the editor only when
 *    the document actually differs, to avoid clobbering an in-flight
 *    selection / IME composition on every parent re-render.
 */
type EditorProps = {
  value: string;
  onChange: (next: string) => void;
  /** Optional ref that receives the raw CodeMirror EditorView once mounted.
   *  Use this for scroll sync, outline jumping, etc. */
  editorViewRef?: MutableRefObject<EditorView | null>;
  /** Called with the 0-based line number whenever the cursor moves */
  onCursorChange?: (line: number) => void;
};

export default function Editor({ value, onChange, editorViewRef, onCursorChange }: EditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onCursorChangeRef = useRef(onCursorChange);
  onCursorChangeRef.current = onCursorChange;

  // Mount CodeMirror once. The doc is seeded with the initial `value`.
  useEffect(() => {
    if (!ref.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        history(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
          // Cmd+H → open search panel with replace field focused
          {
            key: "Mod-h",
            run: (view) => {
              openSearchPanel(view);
              // After the panel mounts, focus the replace input
              setTimeout(() => {
                const el = document.querySelector<HTMLInputElement>(
                  ".cm-search input[name='replace']"
                );
                el?.focus();
              }, 30);
              return true;
            },
            scope: "editor-search-panel",
          },
          indentWithTab,
        ]),
        markdown(),
        oneDark,
        EditorView.theme({
          "&": { height: "100%", fontSize: "14px" },
          ".cm-scroller": { fontFamily: "SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace", lineHeight: "1.6" },
          ".cm-content": { padding: "12px 0" },
          ".cm-gutters": { backgroundColor: "transparent", borderRight: "1px solid rgba(255,255,255,0.06)" },
        }),
        EditorView.updateListener.of((v) => {
          if (v.docChanged) onChangeRef.current(v.state.doc.toString());
          if (v.selectionSet && onCursorChangeRef.current) {
            const head = v.state.selection.main.head;
            const line = v.state.doc.lineAt(head);
            onCursorChangeRef.current(line.number - 1); // 0-based
          }
        }),
      ],
    });

    const view = new EditorView({ state, parent: ref.current });
    viewRef.current = view;
    if (editorViewRef) editorViewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
      if (editorViewRef) editorViewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // initialise once — `value` seeding handled here, later updates via the effect below

  // Mirror external `value` changes into the editor (e.g. after Open
  // replaces the buffer). Skip when the docs already match, so we
  // don't fight a user's in-flight edits or reset their cursor.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  return (
    <section className="editor-pane" aria-label="Markdown source">
      <header>Editor</header>
      <div ref={ref} className="cm-container" />
    </section>
  );
}