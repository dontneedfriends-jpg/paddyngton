#[tauri::command]
pub fn get_version() -> String {
    let config = include_str!("../../tauri.conf.json");
    let parsed: serde_json::Value = serde_json::from_str(config).unwrap_or_default();
    parsed
        .get("version")
        .and_then(|v| v.as_str())
        .unwrap_or(env!("CARGO_PKG_VERSION"))
        .to_string()
}

#[tauri::command]
pub fn get_system_fonts() -> Vec<String> {
    let source = font_kit::source::SystemSource::new();
    match source.all_families() {
        Ok(families) => families,
        Err(_) => vec![],
    }
}
