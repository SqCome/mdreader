# MD Reader

A minimal markdown editor scaffold built with **Tauri v2 + React 18 + TypeScript + Rust**.

This is the foundation for a desktop markdown app. It ships:

- A native window (Tauri) hosting a Vite + React UI
- A two-pane layout: `<textarea>` source on the left, live `markdown-it` HTML preview on the right
- A `hello` Tauri command to verify the JS ↔ Rust invoke chain
- `tauri-plugin-fs` and `tauri-plugin-dialog` pre-wired and capability-scoped, ready for the next task (open / save files)

## Tech stack

| Layer        | Choice                                  |
|--------------|-----------------------------------------|
| Shell        | Tauri v2                                |
| Frontend     | Vite + React 18 + TypeScript            |
| Markdown     | `markdown-it` (rendered client-side)    |
| Backend      | Rust (`src-tauri`)                      |
| Editor       | Plain `<textarea>` (swappable)          |
| Package mgr  | pnpm                                    |

## Directory layout

```
mdreader/
├── index.html                # Vite entry HTML
├── package.json              # pnpm + scripts
├── vite.config.ts            # Vite (port 1420, fixed for Tauri)
├── tsconfig.json
├── tsconfig.node.json
├── .gitignore
├── src/                      # React frontend
│   ├── main.tsx              # React root
│   ├── App.tsx               # Two-pane layout + invoke demo
│   ├── App.css               # Pane + preview styles
│   ├── styles.css            # Global resets
│   └── components/
│       ├── Editor.tsx        # <textarea> — swappable for CodeMirror/Monaco
│       ├── Preview.tsx       # markdown-it → HTML renderer
│       └── Toolbar.tsx       # Top bar + "Greet Rust" button
└── src-tauri/                # Rust backend
    ├── Cargo.toml
    ├── build.rs
    ├── tauri.conf.json
    ├── capabilities/
    │   └── default.json      # fs + dialog permissions, scope-limited
    └── src/
        ├── main.rs           # binary entry, calls mdreader_lib::run()
        └── lib.rs            # #[tauri::command] hello + builder
```

## Prerequisites

- **Node.js** ≥ 18
- **pnpm** ≥ 8
- **Rust** stable (`rustup install stable`) with `cargo`
- **Tauri v2 system deps** for your OS — see <https://tauri.app/start/prerequisites/>

## Run

```bash
# 1. Install JS deps
pnpm install

# 2. Launch the Tauri dev app (compiles Rust, opens the window)
pnpm tauri:dev

# 3. Build a release bundle (.app / .msi / .deb)
pnpm tauri:build
```

Other useful commands:

```bash
pnpm dev               # Vite only (no Tauri shell — useful for UI iteration)
pnpm build             # TypeScript check + Vite build to ./dist
pnpm tauri info        # Print detected Tauri toolchain
```

## Verifying the scaffold works

1. App window opens at 1200×800 with the title `MD Reader`.
2. Left pane: type markdown. Right pane updates live.
3. Click **Greet Rust** in the toolbar → a message starting with `Hello, MD Reader! From Rust via Tauri.` appears in the toolbar.

If all three work, the JS ↔ Tauri ↔ Rust chain is healthy.

## Swapping the editor

`src/components/Editor.tsx` is the only file that owns the editor implementation. Its props are `{ value, onChange }`, which matches CodeMirror 6 and Monaco's controlled APIs. To upgrade:

1. `pnpm add codemirror @codemirror/lang-markdown` (or `monaco-editor`).
2. Replace the body of `Editor.tsx` — keep the props.
3. No changes required in `App.tsx`.

## Notes / next steps

- The `capabilities/default.json` file already grants `fs:default` and `dialog:default`, plus a `fs:scope` allowlist for `$HOME`, `$DOCUMENT`, `$DESKTOP`, `$DOWNLOAD`, and `/tmp`. The next task (open / save markdown files) can call these plugins directly.
- The Rust side currently exposes only `hello`. Add new commands in `src-tauri/src/lib.rs` and register them in the `invoke_handler` list.
- `tauri.conf.json` lists icon paths under `bundle.icon`; for `tauri build` you must provide real icons (e.g. via `pnpm tauri icon ./icon.png`). The scaffold deliberately leaves them out so the repo stays small; `tauri dev` does not need them.
