use serde::{Deserialize, Serialize};

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

#[derive(Deserialize)]
pub struct ChapterData {
    pub name: String,
    pub code: String,
}
