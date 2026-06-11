// mdreader_lib is the Tauri command entry point.
//
// The frontend interacts with the Rust backend through the Tauri invoke
// mechanism. Each `#[tauri::command]` function in this file is exposed to
// the JS/TS side as `invoke("command_name", { ... })`.
//
// Conventions:
//   - All commands return `Result<T, String>` where the error is a
//     human-readable string suitable for direct display in the UI.
//   - Commands must NOT panic or unwrap on user input — every error
//     path is converted to a `String` and propagated.
//   - File-system commands operate on paths the user explicitly hands us
//     (via the dialog plugin or by typing). Scope restrictions are
//     enforced declaratively in `capabilities/default.json`.

use std::fs;
use std::path::{Path, PathBuf};

use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

/// 简单的健康检查命令 —— 验证 JS ↔ Rust 链路打通。
/// 前端可以调用 `invoke("hello", { name: "world" })` 用来冒烟测试。
#[tauri::command]
fn hello(name: &str) -> String {
    format!("Hello, {}! From Rust via Tauri.", name)
}

/// 读取本地文本文件并以 UTF-8 String 返回。
///
/// 错误信息会对前端友好，包含路径和原因（例如权限拒绝、文件不存在、
/// 不是 UTF-8 等）。调用方应当在调用前先确认文件存在（`file_exists`），
/// 或者直接信赖错误信息提示用户。
#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| {
        format!(
            "读取文件失败：{}（路径：{}）",
            e,
            display_path(&path)
        )
    })
}

/// 把内容写入本地文件。若父目录不存在会自动创建（递归 mkdir）。
///
/// 已存在的文件会被覆盖。错误以 String 返回前端，不 panic。
#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    let p = Path::new(&path);

    if let Some(parent) = p.parent() {
        if !parent.as_os_str().is_empty() && !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| {
                format!(
                    "创建父目录失败：{}（目录：{}）",
                    e,
                    display_path(&parent.to_string_lossy())
                )
            })?;
        }
    }

    fs::write(&path, content).map_err(|e| {
        format!(
            "写入文件失败：{}（路径：{}）",
            e,
            display_path(&path)
        )
    })
}

/// 判断文件是否存在。同步检查，直接返回 bool，不抛错。
#[tauri::command]
fn file_exists(path: String) -> bool {
    Path::new(&path).is_file()
}

/// 从完整路径中提取文件名（不含目录部分）。
///
/// 例：`/Users/foo/notes/hello.md` → `hello.md`
/// 如果路径非法或没有文件名部分，返回空字符串。
#[tauri::command]
fn get_file_name(path: String) -> String {
    Path::new(&path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string()
}

/// 弹出系统「打开文件」对话框，让用户选择一个 markdown 文件。
///
/// - 过滤器：`.md`、`.markdown`
/// - 用户取消选择时返回 `Ok(None)`（不是错误）
/// - 选中后返回 `Ok(Some(path))`，路径为字符串
#[tauri::command]
async fn open_file_dialog(app: AppHandle) -> Result<Option<String>, String> {
    let (tx, rx) = std::sync::mpsc::channel::<Option<PathBuf>>();

    app.dialog()
        .file()
        .add_filter("Markdown", &["md", "markdown"])
        .pick_file(move |selected| {
            // pick_file 的回调里把结果送进 channel。
            // None 表示用户取消。
            let _ = tx.send(selected.and_then(|fp| fp.into_path().ok()));
        });

    let result = rx
        .recv()
        .map_err(|e| format!("打开文件对话框失败：{}", e))?;

    Ok(result.map(|p| p.to_string_lossy().to_string()))
}

/// 弹出系统「保存文件」对话框，让用户选择保存位置。
///
/// - 过滤器：`.md`
/// - `default_name` 可作为默认文件名（前端传入 `Some("untitled.md")`）
/// - 用户取消时返回 `Ok(None)`
#[tauri::command]
async fn save_file_dialog(
    app: AppHandle,
    default_name: Option<String>,
) -> Result<Option<String>, String> {
    let (tx, rx) = std::sync::mpsc::channel::<Option<PathBuf>>();

    let mut builder = app.dialog().file().add_filter("Markdown", &["md"]);

    if let Some(name) = default_name {
        if !name.trim().is_empty() {
            builder = builder.set_file_name(name);
        }
    }

    builder.save_file(move |selected| {
        let _ = tx.send(selected.and_then(|fp| fp.into_path().ok()));
    });

    let result = rx
        .recv()
        .map_err(|e| format!("保存文件对话框失败：{}", e))?;

    Ok(result.map(|p| p.to_string_lossy().to_string()))
}

/// 内部辅助：把 path 字符串裁短到「前 60 个字符」，避免错误信息里出现
/// 整段用户路径（可能很长）。仅用于错误信息展示，不影响实际逻辑。
fn display_path(p: &str) -> String {
    if p.chars().count() <= 60 {
        p.to_string()
    } else {
        let truncated: String = p.chars().take(57).collect();
        format!("{}...", truncated)
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            hello,
            read_file,
            write_file,
            file_exists,
            get_file_name,
            open_file_dialog,
            save_file_dialog,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
