use crate::models::ChapterData;
use font_kit::family_name::FamilyName;
use font_kit::properties::Properties;
use font_kit::source::SystemSource;
use printpdf::*;
use std::fs;

fn load_font(doc: &PdfDocumentReference) -> Result<IndirectFontRef, String> {
    let source = SystemSource::new();
    let candidates = [
        "Segoe UI",
        "Arial",
        "DejaVu Sans",
        "Liberation Sans",
        "Noto Sans",
        "Helvetica Neue",
    ];

    for name in &candidates {
        if let Ok(handle) = source.select_best_match(
            &[FamilyName::Title(name.to_string())],
            &Properties::new(),
        ) {
            if let Ok(font) = handle.load() {
                if let Some(data) = font.copy_font_data() {
                    let cursor = std::io::Cursor::new(&data[..]);
                    if let Ok(font_ref) = doc.add_external_font(cursor) {
                        return Ok(font_ref);
                    }
                }
            }
        }
    }

    doc.add_builtin_font(BuiltinFont::Helvetica)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn generate_pdf(
    path: String,
    title: String,
    chapters_json: String,
    toc_label: Option<String>,
) -> Result<(), String> {
    let chapters: Vec<ChapterData> =
        serde_json::from_str(&chapters_json).map_err(|e| e.to_string())?;

    let (doc, page1, layer1) = PdfDocument::new(&title, Mm(210.0), Mm(297.0), "Layer 1");
    let font = load_font(&doc)?;

    let current_layer = doc.get_page(page1).get_layer(layer1);
    current_layer.use_text(&title, 24.0, Mm(20.0), Mm(280.0), &font);
    current_layer.use_text(
        &toc_label.unwrap_or_else(|| "Table of Contents".to_string()),
        16.0,
        Mm(20.0),
        Mm(260.0),
        &font,
    );

    let mut y_pos = 250.0;
    for (i, ch) in chapters.iter().enumerate() {
        y_pos -= 7.0;
        current_layer.use_text(&format!("{}. {}", i + 1, ch.name), 12.0, Mm(25.0), Mm(y_pos), &font);
    }

    y_pos -= 20.0;
    current_layer.use_text(&title, 16.0, Mm(20.0), Mm(y_pos), &font);
    y_pos -= 15.0;

    for ch in &chapters {
        if y_pos < 30.0 {
            break;
        }
        current_layer.use_text(&ch.name, 14.0, Mm(20.0), Mm(y_pos), &font);
        y_pos -= 10.0;

        let clean: String = ch.code.chars().take(500).collect();
        for line in clean.lines().take(15) {
            if y_pos < 20.0 {
                break;
            }
            current_layer.use_text(line, 10.0, Mm(20.0), Mm(y_pos), &font);
            y_pos -= 5.0;
        }
        y_pos -= 10.0;
    }

    // Atomic write: temp file + rename
    let temp_path = format!("{}.tmp", path);
    doc.save(&mut std::io::BufWriter::new(
        fs::File::create(&temp_path).map_err(|e| e.to_string())?,
    ))
    .map_err(|e| e.to_string())?;
    fs::rename(&temp_path, &path).map_err(|e| e.to_string())
}
