use crate::models::VersionSnapshot;
use crate::utils::chrono_lite_now;
use std::fs;
use std::path::Path;

#[tauri::command]
pub fn save_version_snapshot(
    book_dir: String,
    label: String,
) -> Result<VersionSnapshot, String> {
    let versions_dir = Path::new(&book_dir).join(".paddyngton").join("versions");
    fs::create_dir_all(&versions_dir).map_err(|e| e.to_string())?;

    let timestamp = chrono_lite_now();
    let snapshot_id = timestamp.replace(":", "-").replace(".", "_");
    let snapshot_dir = versions_dir.join(&snapshot_id);
    fs::create_dir_all(&snapshot_dir).map_err(|e| e.to_string())?;

    let book_config_path = Path::new(&book_dir).join(".book.json");
    let context_path = Path::new(&book_dir).join(".context.json");

    let mut files_copied = vec![];

    for (src, dst_name) in [(&book_config_path, ".book.json"), (&context_path, ".context.json")].iter() {
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
    ]
    .iter()
    {
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
    fs::write(
        snapshot_dir.join("meta.json"),
        serde_json::to_string_pretty(&meta).unwrap(),
    )
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
    fs::write(
        snapshot_dir.join("text_info.json"),
        serde_json::to_string_pretty(&text_info).unwrap(),
    )
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

#[tauri::command]
pub fn list_version_snapshots(book_dir: String) -> Result<Vec<VersionSnapshot>, String> {
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
                        files: meta["files"]
                            .as_array()
                            .map(|arr| {
                                arr.iter()
                                    .filter_map(|v| v.as_str().map(String::from))
                                    .collect()
                            })
                            .unwrap_or_default(),
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
pub fn restore_version_snapshot(
    book_dir: String,
    snapshot_id: String,
) -> Result<Vec<String>, String> {
    let snapshot_dir = Path::new(&book_dir)
        .join(".paddyngton")
        .join("versions")
        .join(&snapshot_id);
    if !snapshot_dir.exists() {
        return Err(format!("Snapshot not found: {:?}", snapshot_dir));
    }

    let meta_path = snapshot_dir.join("meta.json");
    let meta_content = fs::read_to_string(&meta_path)
        .map_err(|e| format!("Failed to read meta.json: {}", e))?;
    let meta: serde_json::Value = serde_json::from_str(&meta_content)
        .map_err(|e| format!("Failed to parse meta.json: {}", e))?;

    for entry in fs::read_dir(&book_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
        if name == ".paddyngton"
            || name.starts_with('.')
                && !name.ends_with(".md")
                && name != ".book.json"
                && name != ".context.json"
                && name != ".world.json"
                && name != ".kanban.json"
                && name != ".notes.json"
                && name != ".timeline.json"
        {
            continue;
        }
        if path.is_dir() && name != ".paddyngton" {
            let _ = fs::remove_dir_all(&path);
        } else if path.is_file() {
            let _ = fs::remove_file(&path);
        }
    }

    let files: Vec<String> = meta["files"]
        .as_array()
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
