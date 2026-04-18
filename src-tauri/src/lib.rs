use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{Read, Write};
use std::path::Path;
use tauri::Manager;

#[derive(Serialize, Deserialize)]
pub struct VersionSnapshot {
    pub id: String,
    pub timestamp: String,
    pub label: String,
    pub files: Vec<String>,
    pub word_count: u64,
    pub char_count: u64,
    pub chapter_count: usize,
}

#[tauri::command]
fn minimize_window(window: tauri::Window) {
    let _ = window.minimize();
}

#[tauri::command]
fn maximize_window(window: tauri::Window) {
    if window.is_maximized().unwrap_or(false) {
        let _ = window.unmaximize();
    } else {
        let _ = window.maximize();
    }
}

#[tauri::command]
fn close_window(window: tauri::Window) {
    let _ = window.close();
}

#[tauri::command]
fn is_maximized(window: tauri::Window) -> bool {
    window.is_maximized().unwrap_or(false)
}

#[tauri::command]
fn set_always_on_top(window: tauri::Window, value: bool) -> Result<(), String> {
    window.set_always_on_top(value).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn get_system_fonts() -> Vec<String> {
    let source = font_kit::source::SystemSource::new();
    match source.all_families() {
        Ok(families) => families,
        Err(_) => vec![],
    }
}

#[tauri::command]
fn save_version_snapshot(book_dir: String, label: String) -> Result<VersionSnapshot, String> {
    let versions_dir = Path::new(&book_dir).join(".paddyngton").join("versions");
    fs::create_dir_all(&versions_dir).map_err(|e| e.to_string())?;

    let timestamp = chrono_lite_now();
    let snapshot_id = timestamp.replace(":", "-").replace(".", "_");
    let snapshot_dir = versions_dir.join(&snapshot_id);
    fs::create_dir_all(&snapshot_dir).map_err(|e| e.to_string())?;

    let book_config_path = Path::new(&book_dir).join(".book.json");
    let context_path = Path::new(&book_dir).join(".context.json");

    let mut files_copied = vec![];

    for (src, dst_name) in [
        (&book_config_path, ".book.json"),
        (&context_path, ".context.json"),
    ].iter() {
        if src.exists() {
            let dst = snapshot_dir.join(dst_name);
            fs::copy(src, &dst).map_err(|e| e.to_string())?;
            files_copied.push(dst_name.to_string());
        }
    }

    for (src, dst_name) in [
        (Path::new(&book_dir).join(".world.json"), ".world.json"),
        (Path::new(&book_dir).join(".kanban.json"), ".kanban.json"),
        (Path::new(&book_dir).join(".notes.json"), ".notes.json"),
        (Path::new(&book_dir).join(".timeline.json"), ".timeline.json"),
    ].iter() {
        if src.exists() {
            let dst = snapshot_dir.join(dst_name);
            let _ = fs::copy(src, &dst);
            files_copied.push(dst_name.to_string());
        }
    }

    if let Ok(config_str) = fs::read_to_string(&book_config_path) {
        if let Ok(config) = serde_json::from_str::<serde_json::Value>(&config_str) {
            if let Some(chapters) = config.get("chapters").and_then(|c| c.as_array()) {
                for ch in chapters {
                    if let Some(file) = ch.get("file").and_then(|f| f.as_str()) {
                        let src = Path::new(&book_dir).join(file);
                        if src.exists() {
                            let dst = snapshot_dir.join(file);
                            let _ = fs::copy(&src, &dst);
                            files_copied.push(file.to_string());
                        }
                    }
                }
            }
        }
    }

    let meta = serde_json::json!({
        "id": snapshot_id,
        "timestamp": timestamp,
        "label": label,
        "files": files_copied.clone()
    });
    fs::write(snapshot_dir.join("meta.json"), serde_json::to_string_pretty(&meta).unwrap())
        .map_err(|e| e.to_string())?;

    let mut total_words = 0u64;
    let mut total_chars = 0u64;
    for file in &files_copied {
        let src = Path::new(&book_dir).join(file);
        if let Ok(content) = fs::read_to_string(&src) {
            total_words += content.split_whitespace().count() as u64;
            total_chars += content.chars().count() as u64;
        }
    }

    let text_info = serde_json::json!({
        "wordCount": total_words,
        "charCount": total_chars,
        "chapterCount": files_copied.iter().filter(|f| f.ends_with(".md")).count(),
        "snapshotLabel": label,
    });
    fs::write(snapshot_dir.join("text_info.json"), serde_json::to_string_pretty(&text_info).unwrap())
        .map_err(|e| e.to_string())?;

    let chapter_count = files_copied.iter().filter(|f| f.ends_with(".md")).count();
    Ok(VersionSnapshot {
        id: snapshot_id,
        timestamp,
        label,
        files: files_copied,
        word_count: total_words,
        char_count: total_chars,
        chapter_count,
    })
}

fn chrono_lite_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap();
    let secs = now.as_secs();
    let hours = (secs / 3600) % 24;
    let mins = (secs / 60) % 60;
    let s = secs % 60;
    let ms = now.subsec_millis();
    let y = ((secs / 31536000) + 1970) as u16;
    let days_since_epoch = secs / 86400;
    let mut y = y;
    let mut days = days_since_epoch as i64;
    let leap = |y: u16| -> bool { y % 4 == 0 && (y % 100 != 0 || y % 400 == 0) };
    while days > 0 {
        let days_in_year: i64 = if leap(y) { 366 } else { 365 };
        if days >= days_in_year { days -= days_in_year; y += 1; } else { break; }
    }
    let mut yday = days as u16;
    let is_leap = leap(y);
    let days_in_month: [u16; 12] = if is_leap { [31,29,31,30,31,30,31,31,30,31,30,31] } else { [31,28,31,30,31,30,31,31,30,31,30,31] };
    let mut mon: u16 = 0;
    for (i, d) in days_in_month.iter().enumerate() {
        if yday < *d { mon = i as u16; break; }
        yday -= *d;
    }
    let mday = yday + 1;
    let hours = hours as u8;
    let mins = mins as u8;
    let s = s as u8;
    format!("{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}", y, mon+1, mday, hours, mins, s, ms)
}

#[tauri::command]
fn list_version_snapshots(book_dir: String) -> Result<Vec<VersionSnapshot>, String> {
    let versions_dir = Path::new(&book_dir).join(".paddyngton").join("versions");
    if !versions_dir.exists() {
        return Ok(vec![]);
    }
    let mut snapshots = vec![];
    for entry in fs::read_dir(versions_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let meta_path = entry.path().join("meta.json");
        let text_info_path = entry.path().join("text_info.json");
        let mut word_count = 0u64;
        let mut char_count = 0u64;
        let mut chapter_count = 0usize;
        if let Ok(ti_content) = fs::read_to_string(&text_info_path) {
            if let Ok(ti) = serde_json::from_str::<serde_json::Value>(&ti_content) {
                word_count = ti["wordCount"].as_u64().unwrap_or(0);
                char_count = ti["charCount"].as_u64().unwrap_or(0);
                chapter_count = ti["chapterCount"].as_u64().unwrap_or(0) as usize;
            }
        }
        if meta_path.exists() {
            if let Ok(content) = fs::read_to_string(&meta_path) {
                if let Ok(meta) = serde_json::from_str::<serde_json::Value>(&content) {
                    snapshots.push(VersionSnapshot {
                        id: meta["id"].as_str().unwrap_or_default().to_string(),
                        timestamp: meta["timestamp"].as_str().unwrap_or_default().to_string(),
                        label: meta["label"].as_str().unwrap_or_default().to_string(),
                        files: meta["files"].as_array().map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect()).unwrap_or_default(),
                        word_count,
                        char_count,
                        chapter_count,
                    });
                }
            }
        }
    }
    snapshots.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    Ok(snapshots)
}

#[tauri::command]
fn restore_version_snapshot(book_dir: String, snapshot_id: String) -> Result<Vec<String>, String> {
    let snapshot_dir = Path::new(&book_dir).join(".paddyngton").join("versions").join(&snapshot_id);
    if !snapshot_dir.exists() {
        return Err(format!("Snapshot not found: {:?}", snapshot_dir));
    }

    let meta_path = snapshot_dir.join("meta.json");
    let meta_content = fs::read_to_string(&meta_path).map_err(|e| format!("Failed to read meta.json: {}", e))?;
    let meta: serde_json::Value = serde_json::from_str(&meta_content)
        .map_err(|e| format!("Failed to parse meta.json: {}", e))?;

    for entry in fs::read_dir(&book_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
        if name == ".paddyngton" || name.starts_with('.') && !name.ends_with(".md") && name != ".book.json" && name != ".context.json" && name != ".world.json" && name != ".kanban.json" && name != ".notes.json" && name != ".timeline.json" {
            continue;
        }
        if path.is_dir() && name != ".paddyngton" {
            let _ = fs::remove_dir_all(&path);
        } else if path.is_file() {
            let _ = fs::remove_file(&path);
        }
    }

    let files: Vec<String> = meta["files"].as_array()
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
        .unwrap_or_default();

    for file in &files {
        let src = snapshot_dir.join(file);
        let dst = Path::new(&book_dir).join(file);
        if let Some(parent) = dst.parent() {
            let _ = fs::create_dir_all(parent);
        }
        if src.exists() {
            fs::copy(&src, &dst).map_err(|e| format!("Failed to copy {:?}: {}", src, e))?;
        }
    }

    Ok(files)
}

#[tauri::command]
fn open_bear(bear_path: String) -> Result<String, String> {
    let file = fs::File::open(&bear_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
    let temp_dir = std::env::temp_dir().join(format!("paddyngton_{}", rand_id()));
    fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;
    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let outpath = temp_dir.join(file.name());
        if file.name().ends_with('/') {
            fs::create_dir_all(&outpath).map_err(|e| e.to_string())?;
        } else {
            if let Some(p) = outpath.parent() {
                if !p.exists() { fs::create_dir_all(p).map_err(|e| e.to_string())?; }
            }
            let mut outfile = fs::File::create(&outpath).map_err(|e| e.to_string())?;
            std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
        }
    }
    Ok(temp_dir.to_string_lossy().to_string())
}

#[tauri::command]
fn save_bear(book_dir: String, bear_path: String) -> Result<(), String> {
    let file = fs::File::create(&bear_path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);
    let dir = Path::new(&book_dir);
    let known_files = [
        ".book.json", ".context.json", ".world.json", ".kanban.json",
        ".notes.json", ".timeline.json",
    ];
    let known_extensions = [".md"];
    for path in walkdir_files(dir) {
        let file_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
        let relative = path.strip_prefix(dir).unwrap_or(&path);
        let relative_str = relative.to_string_lossy();
        if relative_str.starts_with(".paddyngton") { continue; }
        if known_extensions.iter().any(|ext| file_name.ends_with(ext)) || known_files.contains(&file_name) {
            let mut buffer = Vec::new();
            let mut src = fs::File::open(&path).map_err(|e| e.to_string())?;
            src.read_to_end(&mut buffer).map_err(|e| e.to_string())?;
            zip.start_file(relative_str.replace("\\", "/"), options).map_err(|e| e.to_string())?;
            zip.write_all(&buffer).map_err(|e| e.to_string())?;
        }
    }
    zip.finish().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn create_test_book() -> Result<String, String> {
    let temp_dir = std::env::temp_dir().join(format!("paddyngton_test_{}", rand_id()));
    fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    let book_config = r#"{"title":"Test Book","author":"Test Author","genre":"Novel","bookType":"Novel","description":"","createdAt":"2024-01-01T00:00:00.000Z","chapters":[]}"#;
    let context = r#"[
        {"name":"Main Character","type":"character","details":{"Age":"","Gender":"","Occupation":"","Personality":"","Status":"Alive"},"relations":[],"notes":""},
        {"name":"Setting","type":"place","details":{"Type":"","Location":"","Description":"","Atmosphere":""},"notes":""}
    ]"#;

    fs::write(temp_dir.join(".book.json"), book_config).map_err(|e| e.to_string())?;
    fs::write(temp_dir.join(".context.json"), context).map_err(|e| e.to_string())?;

    Ok(temp_dir.to_string_lossy().to_string())
}

#[tauri::command]
fn delete_file(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if p.exists() {
        if p.is_dir() {
            fs::remove_dir_all(p).map_err(|e| e.to_string())
        } else {
            fs::remove_file(p).map_err(|e| e.to_string())
        }
    } else {
        Ok(())
    }
}

fn rand_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap();
    format!("{}", now.as_nanos())
}

fn walkdir_files(dir: &Path) -> Vec<std::path::PathBuf> {
    let mut results = vec![];
    let mut stack = vec![dir.to_path_buf()];
    while let Some(current) = stack.pop() {
        if let Ok(entries) = fs::read_dir(&current) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    stack.push(path);
                } else {
                    results.push(path);
                }
            }
        }
    }
    results
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            minimize_window,
            maximize_window,
            close_window,
            is_maximized,
            set_always_on_top,
            get_version,
            get_system_fonts,
            save_version_snapshot,
            list_version_snapshots,
            restore_version_snapshot,
            open_bear,
            save_bear,
            create_test_book,
            delete_file
        ])
        .setup(|app| {
            let args: Vec<String> = std::env::args().collect();
            let test_mode = args.iter().any(|a| a == "--test");
            if test_mode {
                if let Some(window) = app.get_webview_window("main") {
                    let _: Result<(), _> = window.eval("window.__TAURI_INTERNALS__ = window.__TAURI_INTERNALS__ || {}; window.__TAURI_INTERNALS__.testMode = true;");
                }
            }

            if cfg!(debug_assertions) {
                let _ = app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                );
            }

            let _ = app.handle().plugin(
                tauri_plugin_updater::Builder::default().build()
            );
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
