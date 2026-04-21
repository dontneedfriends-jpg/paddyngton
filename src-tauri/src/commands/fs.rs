use std::fs;
use std::path::Path;

#[tauri::command]
pub fn save_binary_file(path: String, data: Vec<u8>) -> Result<(), String> {
    fs::write(&path, data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_test_book() -> Result<String, String> {
    let temp_dir = std::env::temp_dir().join(format!("paddyngton_test_{}", crate::utils::rand_id()));
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
pub fn delete_file(path: String) -> Result<(), String> {
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
