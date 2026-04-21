use std::fs;
use std::io::{Read, Write};
use std::path::Path;
use crate::utils::{rand_id, walkdir_files};

#[tauri::command]
pub fn open_bear(bear_path: String) -> Result<String, String> {
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
                if !p.exists() {
                    fs::create_dir_all(p).map_err(|e| e.to_string())?;
                }
            }
            let mut outfile = fs::File::create(&outpath).map_err(|e| e.to_string())?;
            std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
        }
    }
    Ok(temp_dir.to_string_lossy().to_string())
}

#[tauri::command]
pub fn save_bear(book_dir: String, bear_path: String) -> Result<(), String> {
    let file = fs::File::create(&bear_path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);
    let dir = Path::new(&book_dir);
    let known_files = [
        ".book.json",
        ".context.json",
        ".world.json",
        ".kanban.json",
        ".notes.json",
        ".timeline.json",
    ];
    let known_extensions = [".md"];
    for path in walkdir_files(dir) {
        let file_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
        let relative = path.strip_prefix(dir).unwrap_or(&path);
        let relative_str = relative.to_string_lossy();
        if relative_str.starts_with(".paddyngton") {
            continue;
        }
        if known_extensions.iter().any(|ext| file_name.ends_with(ext)) || known_files.contains(&file_name) {
            let mut buffer = Vec::new();
            let mut src = fs::File::open(&path).map_err(|e| e.to_string())?;
            src.read_to_end(&mut buffer).map_err(|e| e.to_string())?;
            zip.start_file(relative_str.replace("\\", "/"), options)
                .map_err(|e| e.to_string())?;
            zip.write_all(&buffer).map_err(|e| e.to_string())?;
        }
    }
    zip.finish().map_err(|e| e.to_string())?;
    Ok(())
}
