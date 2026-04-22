use std::fs;
use std::path::Path;

pub fn chrono_lite_now() -> String {
    chrono::Local::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}

pub fn rand_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap();
    format!("{}", now.as_nanos())
}

pub fn walkdir_files(dir: &Path) -> Vec<std::path::PathBuf> {
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
