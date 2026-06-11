/**
 * Type-safe wrappers around Tauri `invoke` calls for the mdreader backend.
 *
 * The Rust side (src-tauri/src/lib.rs) registers the matching commands and
 * returns the shapes declared here. All Rust-side errors are surfaced as
 * `reject(err: string)` on the JS side, so functions that can fail return
 * `Promise<T>` and let the caller decide whether to wrap in try/catch.
 *
 * Conventions:
 *   - command names use `snake_case` (matching the Rust function names)
 *   - payload keys use `snake_case` (Tauri v2's default argument convention)
 *   - successful responses are unwrapped from the Tauri envelope by `invoke`
 *
 * In the browser (no Tauri runtime), these calls reject — that's fine for
 * the dev server smoke test; the UI handles "invoke failed" gracefully.
 */

import { invoke } from "@tauri-apps/api/core";

// ---------- File I/O (custom Rust commands) ----------

/** Read a UTF-8 text file from disk. Resolves with the file contents. */
export function readFile(path: string): Promise<string> {
  return invoke<string>("read_file", { path });
}

/**
 * Write a UTF-8 text file. Parent directories are created on the Rust
 * side if they do not already exist. Resolves on success.
 */
export function writeFile(path: string, content: string): Promise<void> {
  return invoke<void>("write_file", { path, content });
}

/** Returns true if the file at `path` exists on disk. Never throws. */
export function fileExists(path: string): Promise<boolean> {
  return invoke<boolean>("file_exists", { path });
}

/** Returns the file name (basename) for a given path. Never throws. */
export function getFileName(path: string): Promise<string> {
  return invoke<string>("get_file_name", { path });
}

// ---------- Dialogs (custom Rust commands wrapping tauri-plugin-dialog) ----------

/**
 * Show the OS "open file" picker filtered to .md / .markdown.
 * Resolves with the chosen path, or `null` if the user cancelled.
 */
export function openFileDialog(): Promise<string | null> {
  return invoke<string | null>("open_file_dialog");
}

/**
 * Show the OS "save file" picker filtered to .md.
 * Resolves with the chosen path, or `null` if the user cancelled.
 */
export function saveFileDialog(defaultName?: string): Promise<string | null> {
  return invoke<string | null>("save_file_dialog", {
    defaultName: defaultName ?? null,
  });
}
